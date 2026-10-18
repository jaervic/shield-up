import { describe, expect, it } from 'vitest';
import {
  getFlagValue,
  hasFlag,
  lastPositional,
  parseCommand,
  parsePortSpec,
  positionalArgs,
  tokenize,
} from '@/features/pbq/engine/shell/parse';

describe('tokenize', () => {
  it('separa por espacios y recorta', () => {
    expect(tokenize('  nmap   -sV   10.0.0.5  ')).toEqual(['nmap', '-sV', '10.0.0.5']);
  });

  it('respeta comillas simples y dobles', () => {
    expect(tokenize('grep "Failed password" /var/log/auth.log')).toEqual([
      'grep',
      'Failed password',
      '/var/log/auth.log',
    ]);
    expect(tokenize("echo 'hola mundo'")).toEqual(['echo', 'hola mundo']);
  });

  it('devuelve vacío para una línea vacía', () => {
    expect(tokenize('   ')).toEqual([]);
  });
});

describe('parseCommand', () => {
  it('separa programa, banderas y argumentos', () => {
    const invocation = parseCommand('nmap -sS -p 22,80 10.0.0.5');
    expect(invocation).not.toBeNull();
    expect(invocation?.program).toBe('nmap');
    expect(invocation?.flags).toEqual(['sS', 'p']);
    expect(invocation?.args).toEqual(['22,80', '10.0.0.5']);
  });

  it('normaliza el programa a minúsculas y conserva la línea original', () => {
    const invocation = parseCommand('  NMAP 10.0.0.5 ');
    expect(invocation?.program).toBe('nmap');
    expect(invocation?.raw).toBe('NMAP 10.0.0.5');
  });

  it('acepta banderas largas con y sin valor', () => {
    const invocation = parseCommand('nmap --top-ports=100 --open 10.0.0.5');
    expect(invocation?.flags).toEqual(['top-ports=100', 'open']);
  });

  it('devuelve null si no hay comando', () => {
    expect(parseCommand('')).toBeNull();
    expect(parseCommand('    ')).toBeNull();
  });
});

describe('hasFlag', () => {
  it('encuentra banderas sueltas', () => {
    const invocation = parseCommand('tcpdump -n -i eth0');
    expect(invocation && hasFlag(invocation, 'n')).toBe(true);
    expect(invocation && hasFlag(invocation, 'i')).toBe(true);
    expect(invocation && hasFlag(invocation, 'X')).toBe(false);
  });

  it('encuentra banderas combinadas de una letra', () => {
    const invocation = parseCommand('ss -tulnp');
    expect(invocation).not.toBeNull();
    for (const flag of ['t', 'u', 'l', 'n', 'p']) {
      expect(invocation && hasFlag(invocation, flag), `-${flag} debería estar presente`).toBe(true);
    }
  });

  it('exige coincidencia exacta en banderas de varias letras', () => {
    const invocation = parseCommand('nmap -sV 10.0.0.5');
    expect(invocation && hasFlag(invocation, 'sV')).toBe(true);
    expect(invocation && hasFlag(invocation, 'sv')).toBe(false);
  });
});

describe('getFlagValue', () => {
  it('lee el valor de una bandera corta', () => {
    expect(getFlagValue(parseCommand('nmap -p 22,80 10.0.0.5')!, 'p')).toBe('22,80');
  });

  it('lee el valor de una bandera larga con igual', () => {
    expect(getFlagValue(parseCommand('nmap --top-ports=100 10.0.0.5')!, 'top-ports')).toBe('100');
  });

  it('devuelve null si la bandera no está o no tiene valor', () => {
    expect(getFlagValue(parseCommand('nmap 10.0.0.5')!, 'p')).toBeNull();
    expect(getFlagValue(parseCommand('nmap -p')!, 'p')).toBeNull();
  });
});

describe('positionalArgs / lastPositional', () => {
  it('excluye las banderas y los valores que consumen', () => {
    const invocation = parseCommand('nmap -sV -p 22,80 10.0.0.5')!;
    expect(positionalArgs(invocation, ['p'])).toEqual(['10.0.0.5']);
    expect(lastPositional(invocation, ['p'])).toBe('10.0.0.5');
  });

  it('no confunde el valor de una bandera con el objetivo', () => {
    const invocation = parseCommand('ping -c 3 8.8.8.8')!;
    expect(positionalArgs(invocation, ['c'])).toEqual(['8.8.8.8']);
  });

  it('sin valueFlags, devuelve todos los tokens que no son banderas', () => {
    const invocation = parseCommand('tcpdump -n port 443')!;
    expect(positionalArgs(invocation)).toEqual(['port', '443']);
  });

  it('devuelve null si no hay posicionales', () => {
    expect(lastPositional(parseCommand('nmap -sV')!, ['p'])).toBeNull();
  });
});

describe('parsePortSpec', () => {
  it('lee listas de puertos', () => {
    expect(parsePortSpec('22,80,443')).toEqual([22, 80, 443]);
  });

  it('lee rangos', () => {
    expect(parsePortSpec('20-25')).toEqual([20, 21, 22, 23, 24, 25]);
  });

  it('mezcla listas y rangos, sin duplicados y ordenado', () => {
    expect(parsePortSpec('80,20-22,80')).toEqual([20, 21, 22, 80]);
  });

  it('devuelve null si no hay nada válido', () => {
    expect(parsePortSpec(null)).toBeNull();
    expect(parsePortSpec('')).toBeNull();
    expect(parsePortSpec('abc')).toBeNull();
    expect(parsePortSpec('0')).toBeNull();
  });
});
