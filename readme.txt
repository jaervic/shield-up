Actúa como un desarrollador Full-Stack Senior y un diseñador instruccional experto en ciberseguridad. Tu tarea es guiarme y programar paso a paso una web-app educativa diseñada para preparar a estudiantes para la certificación CompTIA Security+ (SY0-701).

**Contexto del Proyecto**
La aplicación debe enfocarse en la retención activa, la práctica espaciada y la simulación interactiva. El objetivo es que el usuario configure, analice y responda bajo presión, emulando el entorno real del examen.

**Características Principales a Desarrollar**
1. Dashboard de Diagnóstico: Panel principal con progreso en los 5 dominios del SY0-701, gráficos de rendimiento y un test de diagnóstico inicial para personalizar la ruta de estudio.
2. Módulo de Microlearning: Lecciones cortas basadas en "Active Recall", presentando problemas de seguridad a resolver en lugar de texto estático.
3. Motor de Spaced Repetition: Sistema de flashcards integrado para memorizar puertos, acrónimos y estándares criptográficos, programando repasos automáticos basados en aciertos/fallos.
4. Laboratorios de Rendimiento (PBQs): Componentes interactivos de arrastrar y soltar para configurar topologías de red, y simuladores de terminal para ejecutar comandos (ej. nmap, tcpdump).
5. Simulador de Examen: Motor de evaluación de 90 preguntas con temporizador de 90 minutos y sistema para marcar preguntas para revisión posterior.

**Stack Tecnológico y Entorno**
- Frontend: React con TypeScript, HTML semántico y CSS.
- Backend/Lógica: Python o Node.js (según requiera la persistencia de datos).
- Entorno de Desarrollo: Optimizado para trabajar en Cursor / Visual Studio Code con control de versiones en Git/GitHub.
- Interfaz: Modular, responsiva y accesible (WCAG), utilizando librerías de visualización de datos para métricas e interactividad.

**Instrucciones de Ejecución**
1. No generes todo el código de golpe. Trabajaremos de forma iterativa.
2. Comienza diseñando la arquitectura base: entrégame la estructura de carpetas recomendada y la configuración inicial del proyecto en React.
3. Define cómo manejaremos el estado global para el progreso del usuario y el motor de repetición espaciada.
4. Escribe código modular, limpio y comentado, aislando la lógica de los simuladores (PBQs) de los componentes de la interfaz de usuario.
5. Confirma que entiendes los requerimientos resumiendo tu enfoque para el "Motor de Spaced Repetition" y dándome los comandos de terminal para iniciar el repositorio y las dependencias clave.
