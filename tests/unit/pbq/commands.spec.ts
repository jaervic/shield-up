import { describe, expect, it } from 'vitest';
import type { HostState } from '@/domain/pbq';
import { COMMAND_NAMES, executeCommand } from '@/features/pbq/engine/shell/commands';

const STATE: HostState = {
  hostname: 'lab-wks',
  interfaces: [{ name: 'eth0', ip: '10.0.0.9/24', mac: '52:54:00:00:00:09', state: 'UP' }],
  routes: [{ destination: '10.0.0.0/24', gateway: '0.0.0.0', iface: 'eth0' }],
  arp: [{ ip: '10.0.0.1', mac: '52:54:00:00:00:01' }],
  listening: [
    { port: 22, protocol: 'tcp', process: 'sshd', pid: 812, address: '0.0.0.0' },
    { port: 53, protocol: 'udp', process: 'dnsmasq', pid: 700, address: '127.0.0.1' },
  ],
  processes: [{ pid: 812, user: 'root', command: '/usr/sbin/sshd -D' }],
  dns: { 'web.corp.local': '10.0.0.20' },
  hosts: [
    {
      ip: '10.0.0.20',
      hostname: 'web.corp.local',
      up: true,
      ports: [
        { port: 80, protocol: 'tcp', service: 'http', version: 'nginx 1.24.0' },
        { port: 443, protocol: 'tcp', service: 'ssl/https', version: 'nginx 1.24.0' },
        { port: 8080, protocol: 'tcp', service: 'http-proxy' },
      ],
    },
    { ip: '10.0.0.30', hostname: 'caido.corp.local', up: false, ports: [] },
  ],
  packets: [
    { time: 0.5, src: '10.0.0.9', dst: '10.0.0.20', protocol: 'TCP', srcPort: 51000, dstPort: 443, flags: 'S', length: 0 },
    { time: 1.25, src: '10.0.0.20', dst: '10.0.0.9', protocol: 'TCP', srcPort: 443, dstPort: 51000, flags: 'SA', length: 0 },
    { time: 2.75, src: '10.0.0.9', dst: '10.0.0.20', protocol: 'TCP', srcPort: 51000, dstPort: 8080, flags: 'PA', length: 517 },
    { time: 3.5, src: '10.0.0.9', dst: '8.8.8.8', protocol: 'ICMP', length: 98 },
  ],
  files: {
    '/etc/hosts': '127.0.0.1 localhost\n10.0.0.20 web.corp.local',
    '/var/log/auth.log': 'Failed password for root\nAccepted password for analista\nFailed password for admin',
  },
};

function run(line: string): string[] {
  const result = executeCommand(line, STATE);
  return result?.lines ?? [];
}

describe('executeCommand', () => {
  it('devuelve null para una línea vacía', () => {
    expect(executeCommand('   ', STATE)).toBeNull();
  });

  it('avisa de un comando desconocido con el código 127', () => {
    const result = executeCommand('rm -rf /', STATE);
    expect(result?.exitCode).toBe(127);
    expect(result?.lines[0]).toMatch(/command not found/);
  });

  it('help lista todos los comandos disponibles', () => {
    const lines = run('help');
    for (const name of COMMAND_NAMES) {
      expect(lines.join('\n'), `help debería mencionar ${name}`).toContain(name);
    }
  });

  it('clear pide limpiar la pantalla', () => {
    const result = executeCommand('clear', STATE);
    expect(result?.clear).toBe(true);
    expect(result?.lines).toEqual([]);
  });
});

describe('nmap', () => {
  it('enumera los puertos abiertos del objetivo', () => {
    const lines = run('nmap 10.0.0.20');
    expect(lines.join('\n')).toContain('10.0.0.20');
    expect(lines.join('\n')).toContain('80/tcp  open  http');
    expect(lines.join('\n')).toContain('443/tcp  open');
  });

  it('resuelve el objetivo por nombre DNS', () => {
    const lines = run('nmap web.corp.local');
    expect(lines.join('\n')).toContain('web.corp.local (10.0.0.20)');
  });

  it('con -sV añade las versiones', () => {
    expect(run('nmap -sV 10.0.0.20').join('\n')).toContain('nginx 1.24.0');
    expect(run('nmap 10.0.0.20').join('\n')).not.toContain('nginx 1.24.0');
  });

  it('con -p limita el escaneo', () => {
    const lines = run('nmap -p 8080 10.0.0.20').join('\n');
    expect(lines).toContain('8080/tcp  open');
    expect(lines).not.toContain('443/tcp');
  });

  it('informa cuando el host está caído', () => {
    expect(run('nmap 10.0.0.30').join('\n')).toContain('Host is down');
  });

  it('informa cuando el objetivo no existe', () => {
    const result = executeCommand('nmap 192.168.99.99', STATE);
    expect(result?.exitCode).toBe(1);
    expect(result?.lines.join('\n')).toMatch(/Host seems down/);
  });

  it('exige un objetivo', () => {
    const result = executeCommand('nmap', STATE);
    expect(result?.exitCode).toBe(1);
    expect(result?.lines[0]).toMatch(/se requiere un objetivo/);
  });

  it('acepta una red en notación CIDR', () => {
    expect(run('nmap 10.0.0.0/24').join('\n')).toContain('web.corp.local');
  });
});

describe('tcpdump', () => {
  it('lista los paquetes con marca de tiempo determinista', () => {
    const lines = run('tcpdump -n -i eth0');
    expect(lines[1]).toContain('listening on eth0');
    expect(lines[2]).toContain('14:32:00.500000 IP 10.0.0.9.51000 > 10.0.0.20.443: Flags [S]');
    expect(lines.join('\n')).toContain('4 packet(s) captured');
  });

  it('filtra por puerto', () => {
    const lines = run('tcpdump -n port 8080');
    expect(lines.join('\n')).toContain('8080');
    expect(lines.join('\n')).toContain('1 packet(s) captured');
  });

  it('filtra por host', () => {
    const lines = run('tcpdump host 8.8.8.8');
    expect(lines.join('\n')).toContain('ICMP echo request');
    expect(lines.join('\n')).toContain('1 packet(s) captured');
  });

  it('filtra por protocolo', () => {
    expect(run('tcpdump tcp').join('\n')).toContain('3 packet(s) captured');
  });

  it('con -c limita el número de paquetes', () => {
    expect(run('tcpdump -n -c 2').join('\n')).toContain('2 packet(s) captured');
  });

  it('combina filtros con AND', () => {
    // Dos paquetes tocan el 443: la petición y la respuesta.
    expect(run('tcpdump tcp port 443').join('\n')).toContain('2 packet(s) captured');
    expect(run('tcpdump udp port 443').join('\n')).toContain('0 packet(s) captured');
  });
});

describe('ss y netstat', () => {
  it('ss lista los puertos en escucha', () => {
    const lines = run('ss -tuln');
    expect(lines[0]).toContain('State');
    expect(lines.join('\n')).toContain('0.0.0.0:22');
  });

  it('ss -p añade el proceso', () => {
    expect(run('ss -tulnp').join('\n')).toContain('sshd",pid=812');
  });

  it('ss -t filtra solo TCP', () => {
    const lines = run('ss -tl').join('\n');
    expect(lines).toContain(':22');
    expect(lines).not.toContain(':53');
  });

  it('ss -u filtra solo UDP', () => {
    const lines = run('ss -ul').join('\n');
    expect(lines).toContain(':53');
    expect(lines).not.toContain(':22');
  });

  it('netstat presenta el mismo dato con otro formato', () => {
    const lines = run('netstat -tulnp');
    expect(lines[0]).toContain('Proto');
    expect(lines.join('\n')).toContain('812/sshd');
  });
});

describe('ip', () => {
  it('ip a muestra las interfaces', () => {
    const lines = run('ip a').join('\n');
    expect(lines).toContain('eth0');
    expect(lines).toContain('inet 10.0.0.9/24');
  });

  it('ip route muestra la tabla de rutas', () => {
    expect(run('ip route').join('\n')).toContain('10.0.0.0/24 via 0.0.0.0 dev eth0');
  });

  it('ip neigh muestra la tabla ARP', () => {
    expect(run('ip neigh').join('\n')).toContain('10.0.0.1');
  });
});

describe('ping', () => {
  it('responde si el host está levantado', () => {
    const lines = run('ping -c 2 10.0.0.20').join('\n');
    expect(lines).toContain('icmp_seq=1');
    expect(lines).toContain('2 packets transmitted, 2 received, 0% packet loss');
  });

  it('informa de pérdida total si no hay respuesta', () => {
    const lines = run('ping -c 2 8.8.8.8').join('\n');
    expect(lines).toContain('100% packet loss');
  });

  it('exige un destino', () => {
    expect(executeCommand('ping', STATE)?.exitCode).toBe(1);
  });
});

describe('cat y grep', () => {
  it('cat muestra el contenido de un archivo', () => {
    expect(run('cat /etc/hosts').join('\n')).toContain('127.0.0.1 localhost');
  });

  it('cat avisa si el archivo no existe', () => {
    const result = executeCommand('cat /etc/shadow', STATE);
    expect(result?.exitCode).toBe(1);
    expect(result?.lines[0]).toMatch(/No such file/);
  });

  it('grep filtra las líneas que coinciden', () => {
    const lines = run('grep Failed /var/log/auth.log');
    expect(lines).toHaveLength(2);
    expect(lines.every((line) => line.includes('Failed'))).toBe(true);
  });

  it('grep ignora mayúsculas y minúsculas', () => {
    expect(run('grep failed /var/log/auth.log')).toHaveLength(2);
  });

  it('grep devuelve código 1 si no hay coincidencias', () => {
    expect(executeCommand('grep zzz /var/log/auth.log', STATE)?.exitCode).toBe(1);
  });

  it('grep exige patrón y archivo', () => {
    expect(executeCommand('grep Failed', STATE)?.exitCode).toBe(1);
  });
});
