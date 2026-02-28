/**
 * i18n — Full bilingual dictionary for the portfolio.
 *
 * Architecture:
 *   - `getLang()` reads from localStorage at build-time default or client-side toggle.
 *   - `t(key)` returns the string for the current language.
 *   - All UI strings live here — components import `t` and `getLang`.
 *   - nav.js uses the `window.__i18n` dict injected by BaseLayout for runtime strings.
 */

export type Lang = 'en' | 'es';
export const LANG_KEY = 'portfolio.lang';
export const DEFAULT_LANG: Lang = 'en';

export const LANG_LABELS: Record<Lang, string> = {
  en: 'EN',
  es: 'ES',
};

export const LANG_NAMES: Record<Lang, string> = {
  en: 'English',
  es: 'Español',
};

/* ═══════════════════════════════════════════════════════════════════════════
 *  Master dictionary — every user-facing string on the site
 * ═══════════════════════════════════════════════════════════════════════ */

export const dictionary: Record<string, Record<Lang, string>> = {
  /* ── Site-level ── */
  'site.brand': { en: 'Sergio B. / Field Notes', es: 'Sergio B. / Notas de Campo' },
  'site.role': { en: 'Linux & Virtualization Engineer', es: 'Ingeniero Linux y Virtualización' },
  'site.tagline': { en: 'Infrastructure delivery, automation, and applied enterprise AI', es: 'Entrega de infraestructura, automatización e IA empresarial aplicada' },
  'site.description': { en: 'Case-study driven portfolio focused on Linux platform engineering, virtualization, Ansible automation, RHEL lifecycle modernization, and practical AI integration in enterprise environments.', es: 'Portfolio basado en casos prácticos centrado en ingeniería de plataformas Linux, virtualización, automatización con Ansible, modernización del ciclo de vida RHEL e integración práctica de IA en entornos empresariales.' },
  'site.profileSummary': { en: 'Linux and virtualization engineer documenting real delivery patterns: clear issue statements, implementation choices, and production outcomes.', es: 'Ingeniero Linux y virtualización documentando patrones reales de entrega: planteamientos claros, decisiones de implementación y resultados en producción.' },
  'site.footer': { en: 'Case-study driven engineering portfolio', es: 'Portfolio de ingeniería basado en casos prácticos' },

  /* ── Navigation ── */
  'nav.home': { en: 'Home', es: 'Inicio' },
  'nav.archive': { en: 'Archive', es: 'Archivo' },
  'nav.about': { en: 'About + CV', es: 'Acerca de + CV' },
  'nav.domains': { en: 'Domains', es: 'Dominios' },
  'nav.years': { en: 'Years', es: 'Años' },
  'nav.portfolio': { en: 'Portfolio', es: 'Portfolio' },
  'nav.search': { en: 'Search', es: 'Buscar' },
  'nav.searchPlaceholder': { en: 'grep post...', es: 'buscar post...' },
  'nav.go': { en: 'Go', es: 'Ir' },
  'nav.links': { en: 'Links', es: 'Enlaces' },
  'nav.session': { en: 'Session:', es: 'Sesión:' },
  'nav.commandPalette': { en: 'Command palette:', es: 'Paleta de comandos:' },
  'nav.skipToContent': { en: 'Skip to content', es: 'Ir al contenido' },
  'nav.breadcrumbHome': { en: 'Home', es: 'Inicio' },
  'nav.backToPosts': { en: '← Back to posts', es: '← Volver a posts' },
  'nav.browseArchive': { en: '← Browse archive', es: '← Explorar archivo' },

  /* ── Hero section ── */
  'hero.kicker': { en: 'sergio@portfolio:~$ whoami', es: 'sergio@portfolio:~$ whoami' },
  'hero.typewriter': { en: 'Production ops and platform modernization field notes', es: 'Notas de campo sobre operaciones en producción y modernización de plataformas' },
  'hero.description': { en: 'Practical posts organized as case studies with clear situation, issue, solution, usage context, and impact.', es: 'Posts prácticos organizados como casos de estudio con situación, problema, solución, contexto de uso e impacto claros.' },
  'hero.recruiterView': { en: 'Recruiter View', es: 'Vista Recruiter' },
  'hero.aboutCv': { en: 'About + CV', es: 'Acerca de + CV' },
  'hero.archive': { en: 'Archive', es: 'Archivo' },
  'hero.currentRole': { en: 'Current role', es: 'Puesto actual' },
  'hero.roleTitle': { en: 'Linux & Virtualization Engineer', es: 'Ingeniero Linux y Virtualización' },
  'hero.roleCompany': { en: 'Deutsche Pfandbriefbank AG · Madrid · Hybrid', es: 'Deutsche Pfandbriefbank AG · Madrid · Híbrido' },
  'hero.publishedPosts': { en: 'Published posts', es: 'Posts publicados' },
  'hero.postsMeta': { en: 'Case-study driven technical notes', es: 'Notas técnicas basadas en casos prácticos' },
  'hero.lastUpdate': { en: 'Last update', es: 'Última actualización' },
  'hero.noPostsYet': { en: 'No posts yet', es: 'Sin posts aún' },
  'hero.archiveFirst': { en: 'Archive-first publishing flow', es: 'Flujo de publicación enfocado en archivo' },

  /* ── Delivery Focus ── */
  'focus.title': { en: 'Delivery Focus', es: 'Foco de Entrega' },
  'focus.profile': { en: 'Profile', es: 'Perfil' },
  'focus.infraTitle': { en: 'Infrastructure automation at scale', es: 'Automatización de infraestructura a escala' },
  'focus.infraDesc': { en: 'Ansible + Git workflows for auditable rollouts, lifecycle changes, and safer operational execution.', es: 'Flujos Ansible + Git para despliegues auditables, cambios de ciclo de vida y ejecución operativa más segura.' },
  'focus.rhelTitle': { en: 'RHEL modernization', es: 'Modernización RHEL' },
  'focus.rhelDesc': { en: 'RHEL 7/8 to 9 migration planning, Satellite lifecycle control, patch orchestration, and hardening.', es: 'Planificación de migración RHEL 7/8 a 9, control de ciclo de vida Satellite, orquestación de parches y hardening.' },
  'focus.aiTitle': { en: 'Applied enterprise AI', es: 'IA empresarial aplicada' },
  'focus.aiDesc': { en: 'Azure AI Foundry and document intelligence pilots translated into operationally viable workloads.', es: 'Pilotos de Azure AI Foundry e inteligencia documental traducidos en cargas de trabajo operativas viables.' },

  /* ── Audience mode ── */
  'audience.title': { en: 'Choose Your View', es: 'Elige Tu Vista' },
  'audience.currentRecruiter': { en: 'Current: Recruiter Mode', es: 'Actual: Modo Recruiter' },
  'audience.currentEngineer': { en: 'Current: Engineer Mode', es: 'Actual: Modo Ingeniero' },
  'audience.recruiterMode': { en: 'Recruiter Mode', es: 'Modo Recruiter' },
  'audience.engineerMode': { en: 'Engineer Mode', es: 'Modo Ingeniero' },
  'audience.copy': { en: 'Recruiter view prioritizes impact, role fit, and business outcomes first. Engineer view enables full live labs, telemetry streams, and command simulations.', es: 'La vista Recruiter prioriza impacto, encaje y resultados de negocio. La vista Ingeniero habilita labs en vivo, telemetría y simulaciones de comandos.' },

  /* ── Recruiter snapshot ── */
  'recruiter.title': { en: 'Recruiter Snapshot', es: 'Resumen para Recruiters' },
  'recruiter.fullProfile': { en: 'Full profile', es: 'Perfil completo' },
  'recruiter.badge': { en: '● Recruiter-ready overview', es: '● Resumen listo para recruiters' },
  'recruiter.summary': { en: 'Linux and virtualization engineer with a delivery-first portfolio focused on automation, platform reliability, and practical enterprise AI implementation.', es: 'Ingeniero Linux y virtualización con un portfolio orientado a entrega, centrado en automatización, fiabilidad de plataformas e implementación práctica de IA empresarial.' },
  'recruiter.roleFit': { en: 'Role fit', es: 'Encaje profesional' },
  'recruiter.roleFit1': { en: 'Linux platform administration in enterprise environments', es: 'Administración de plataformas Linux en entornos empresariales' },
  'recruiter.roleFit2': { en: 'Infrastructure as code with Ansible + Git workflow discipline', es: 'Infraestructura como código con disciplina Ansible + Git' },
  'recruiter.roleFit3': { en: 'Cross-team delivery from design through operational handoff', es: 'Entrega cross-team desde diseño hasta traspaso operativo' },
  'recruiter.topOutcomes': { en: 'Top outcomes', es: 'Resultados destacados' },
  'recruiter.outcome1': { en: 'Patch and lifecycle orchestration patterns for safer rollouts', es: 'Patrones de orquestación de parches y ciclo de vida para despliegues más seguros' },
  'recruiter.outcome2': { en: 'RHEL modernization playbooks for controlled migrations', es: 'Playbooks de modernización RHEL para migraciones controladas' },
  'recruiter.outcome3': { en: 'Applied AI pilots documented from prototype to operations', es: 'Pilotos de IA aplicada documentados desde prototipo hasta operaciones' },
  'recruiter.quickActions': { en: 'Quick actions', es: 'Acciones rápidas' },
  'recruiter.openProfile': { en: 'Open profile and experience summary', es: 'Abrir perfil y resumen de experiencia' },
  'recruiter.reviewStudies': { en: 'Review all case studies', es: 'Revisar todos los casos de estudio' },
  'recruiter.ctaText': { en: 'Ready to review full experience and delivery outcomes?', es: '¿Listo para revisar experiencia completa y resultados de entrega?' },
  'recruiter.ctaButton': { en: 'Open Profile & CV', es: 'Abrir Perfil y CV' },

  /* ── Engineer zone teaser ── */
  'engineer.labsTitle': { en: 'Engineer Labs', es: 'Labs de Ingeniería' },
  'engineer.switchButton': { en: 'Switch to Engineer Mode', es: 'Cambiar a Modo Ingeniero' },
  'engineer.teaserText': { en: 'Recruiter Mode keeps this portfolio concise and impact-first. Switch to Engineer Mode to open live Linux telemetry, command simulation, and network topology labs.', es: 'El Modo Recruiter mantiene este portfolio conciso y enfocado en impacto. Cambia al Modo Ingeniero para abrir labs de telemetría Linux en vivo, simulación de comandos y topología de red.' },

  /* ── Engineer Lab ── */
  'engineerLab.title': { en: 'Engineer Lab · Live Linux + AI Simulation', es: 'Lab de Ingeniería · Simulación Linux + IA en Vivo' },
  'engineerLab.status': { en: 'stream: ready', es: 'stream: listo' },
  'engineerLab.tabOps': { en: 'ops stream', es: 'stream ops' },
  'engineerLab.tabAnsible': { en: 'ansible rollout', es: 'rollout ansible' },
  'engineerLab.tabAi': { en: 'ai inference', es: 'inferencia ia' },

  /* ── Ops Deck ── */
  'opsDeck.title': { en: 'Ops Cockpit · top + command sandbox', es: 'Cockpit Ops · top + sandbox de comandos' },
  'opsDeck.modeNormal': { en: 'Mode: Normal', es: 'Modo: Normal' },
  'opsDeck.modeHardcore': { en: 'Mode: Hardcore', es: 'Modo: Hardcore' },
  'opsDeck.cpu': { en: 'CPU load', es: 'Carga CPU' },
  'opsDeck.memory': { en: 'Memory pressure', es: 'Presión de memoria' },
  'opsDeck.errors': { en: 'Error rate', es: 'Tasa de errores' },
  'opsDeck.cache': { en: 'Prompt cache hit', es: 'Acierto caché prompt' },
  'opsDeck.processTitle': { en: 'Process monitor', es: 'Monitor de procesos' },
  'opsDeck.processMeta': { en: 'click headers to sort · values stream live', es: 'clic en cabeceras para ordenar · valores en vivo' },
  'opsDeck.sandboxTitle': { en: 'Command sandbox', es: 'Sandbox de comandos' },
  'opsDeck.sandboxMeta': { en: 'try: top · journalctl -n 5 · ansible --version · ai.health', es: 'prueba: top · journalctl -n 5 · ansible --version · ai.health' },
  'opsDeck.inputPlaceholder': { en: 'Type a command...', es: 'Escribe un comando...' },
  'opsDeck.run': { en: 'Run', es: 'Ejecutar' },
  'opsDeck.helpHint': { en: 'Try `help` for available commands.', es: 'Prueba `help` para ver comandos disponibles.' },

  /* ── Network Topology ── */
  'network.title': { en: 'Live Network Topology', es: 'Topología de Red en Vivo' },
  'network.status': { en: 'mode: normal · mesh stable', es: 'modo: normal · malla estable' },

  /* ── Domains ── */
  'domains.title': { en: 'Domains', es: 'Dominios' },
  'domains.browseAll': { en: 'Browse all', es: 'Ver todos' },
  'domains.activeDomains': { en: 'active domains with published case studies.', es: 'dominios activos con casos de estudio publicados.' },

  /* ── Categories ── */
  'cat.infrastructure': { en: 'Infrastructure', es: 'Infraestructura' },
  'cat.infrastructure.desc': { en: 'RHEL lifecycle, automation, virtualization, and production operations.', es: 'Ciclo de vida RHEL, automatización, virtualización y operaciones en producción.' },
  'cat.automation': { en: 'Automation', es: 'Automatización' },
  'cat.automation.desc': { en: 'Ansible playbooks, task automation, and configuration management.', es: 'Playbooks Ansible, automatización de tareas y gestión de configuración.' },
  'cat.ai': { en: 'AI', es: 'IA' },
  'cat.ai.desc': { en: 'Generative AI use cases, integration patterns, and practical lessons.', es: 'Casos de uso de IA generativa, patrones de integración y lecciones prácticas.' },
  'cat.cloud': { en: 'Cloud', es: 'Cloud' },
  'cat.cloud.desc': { en: 'Azure architecture, infrastructure design, and delivery practices.', es: 'Arquitectura Azure, diseño de infraestructura y prácticas de entrega.' },
  'cat.local-ai': { en: 'Local AI', es: 'IA Local' },
  'cat.local-ai.desc': { en: 'Running models on local hardware with privacy-first workflows.', es: 'Ejecución de modelos en hardware local con flujos privacy-first.' },
  'cat.kotlin': { en: 'Kotlin', es: 'Kotlin' },
  'cat.kotlin.desc': { en: 'Kotlin projects, notes, and engineering experiments.', es: 'Proyectos Kotlin, notas y experimentos de ingeniería.' },
  'cat.snippets': { en: 'Snippets', es: 'Snippets' },
  'cat.snippets.desc': { en: 'Quick commands and reusable building blocks for day-to-day work.', es: 'Comandos rápidos y bloques reutilizables para el día a día.' },
  'cat.career': { en: 'Career', es: 'Carrera' },
  'cat.career.desc': { en: 'Professional updates, retrospectives, and growth notes.', es: 'Actualizaciones profesionales, retrospectivas y notas de crecimiento.' },

  /* ── Latest posts ── */
  'posts.recent': { en: 'Recent Case Studies', es: 'Casos de Estudio Recientes' },
  'posts.allPosts': { en: 'All posts', es: 'Todos los posts' },
  'posts.noPosts': { en: 'No posts published yet.', es: 'Sin posts publicados aún.' },
  'posts.minRead': { en: 'min read', es: 'min lectura' },
  'posts.issue': { en: 'Issue:', es: 'Problema:' },
  'posts.solution': { en: 'Solution:', es: 'Solución:' },
  'posts.usedIn': { en: 'Used In:', es: 'Usado en:' },
  'posts.impact': { en: 'Impact:', es: 'Impacto:' },
  'posts.situation': { en: 'Situation', es: 'Situación' },

  /* ── Archive ── */
  'archive.title': { en: 'All Case Studies', es: 'Todos los Casos de Estudio' },
  'archive.eyebrow': { en: 'Archive', es: 'Archivo' },
  'archive.description': { en: 'posts grouped by year, each with clear issue and solution framing.', es: 'posts agrupados por año, cada uno con planteamiento claro de problema y solución.' },
  'archive.searchPlaceholder': { en: 'Search all posts (title, issue, solution, tags)...', es: 'Buscar posts (título, problema, solución, tags)...' },
  'archive.searchPosts': { en: 'Search posts', es: 'Buscar posts' },
  'archive.noMatches': { en: 'No matches.', es: 'Sin resultados.' },
  'archive.matches': { en: 'matches', es: 'coincidencias' },
  'archive.match': { en: 'match', es: 'coincidencia' },

  /* ── About page ── */
  'about.pageTitle': { en: 'About', es: 'Acerca de' },
  'about.pageDesc': { en: 'Professional profile, impact statements, and CV summary.', es: 'Perfil profesional, declaraciones de impacto y resumen de CV.' },
  'about.eyebrow': { en: 'Profile', es: 'Perfil' },
  'about.headline': { en: 'Linux & Virtualization Engineer with automation-first execution.', es: 'Ingeniero Linux y Virtualización con ejecución automation-first.' },
  'about.intro': { en: 'I design and operate enterprise Linux platforms, standardize delivery through Ansible and Git, and bridge infrastructure operations with practical Generative AI implementations.', es: 'Diseño y opero plataformas Linux empresariales, estandarizo la entrega con Ansible y Git, y conecto operaciones de infraestructura con implementaciones prácticas de IA Generativa.' },
  'about.snapshot': { en: 'Professional Snapshot', es: 'Resumen Profesional' },
  'about.infraTitle': { en: 'Infrastructure lifecycle ownership', es: 'Gestión del ciclo de vida de infraestructura' },
  'about.infraDesc': { en: 'RHEL migrations, Satellite lifecycle control, patch management, hardening, and HA/DR readiness.', es: 'Migraciones RHEL, control de ciclo de vida Satellite, gestión de parches, hardening y preparación HA/DR.' },
  'about.autoTitle': { en: 'Automation discipline', es: 'Disciplina de automatización' },
  'about.autoDesc': { en: 'Ansible orchestration and Git-based change control for repeatable, peer-reviewed, and auditable operations.', es: 'Orquestación Ansible y control de cambios basado en Git para operaciones repetibles, revisadas por pares y auditables.' },
  'about.aiTitle': { en: 'AI integration for business cases', es: 'Integración de IA para casos de negocio' },
  'about.aiDesc': { en: 'Applied GenAI initiatives using Azure AI Foundry, document intelligence, and model fine-tuning workflows.', es: 'Iniciativas de GenAI aplicada usando Azure AI Foundry, inteligencia documental y flujos de fine-tuning de modelos.' },
  'about.experience': { en: 'Experience', es: 'Experiencia' },
  'about.coreAreas': { en: 'Core Areas', es: 'Áreas Principales' },
  'about.cvTitle': { en: 'CV / Resume', es: 'CV / Currículum' },
  'about.cvDesc': { en: 'Detailed CV is available as a PDF with role scope, delivery outcomes, and full technology coverage.', es: 'El CV detallado está disponible en PDF con alcance del puesto, resultados de entrega y cobertura tecnológica completa.' },
  'about.cvDisabled': { en: 'CV link is temporarily unavailable.', es: 'El enlace al CV no está disponible temporalmente.' },
  'about.principles': { en: 'Operating Principles', es: 'Principios Operativos' },
  'about.principle1Title': { en: 'Codify repeatable operations', es: 'Codificar operaciones repetibles' },
  'about.principle1Desc': { en: 'Every recurring action should move from ad-hoc command execution into tested automation.', es: 'Cada acción recurrente debería pasar de ejecución ad-hoc de comandos a automatización probada.' },
  'about.principle2Title': { en: 'State the problem before the tool', es: 'Plantear el problema antes que la herramienta' },
  'about.principle2Desc': { en: 'Technology choices are justified by incident patterns, constraints, and measurable operational outcomes.', es: 'Las decisiones tecnológicas se justifican por patrones de incidentes, restricciones y resultados operativos medibles.' },
  'about.principle3Title': { en: 'Keep portfolio content safe', es: 'Mantener el contenido del portfolio seguro' },
  'about.principle3Desc': { en: 'Write with practical depth while avoiding confidential architecture, identities, or customer-sensitive data.', es: 'Escribir con profundidad práctica evitando arquitectura confidencial, identidades o datos sensibles de clientes.' },

  /* ── About: Experience entries ── */
  'exp.pbb.title': { en: 'Linux and Virtualization Engineer · Deutsche Pfandbriefbank AG', es: 'Ingeniero Linux y Virtualización · Deutsche Pfandbriefbank AG' },
  'exp.pbb.subtitle': { en: 'Full-time · Hybrid · Madrid, Comunidad de Madrid, España', es: 'Tiempo completo · Híbrido · Madrid, Comunidad de Madrid, España' },
  'exp.pbb.period': { en: 'Jul 2025 - Present', es: 'Jul 2025 - Presente' },
  'exp.pbb.1': { en: 'Architect automated server deployment and lifecycle workflows with Ansible + Git version control.', es: 'Arquitectura de despliegue automatizado de servidores y flujos de ciclo de vida con Ansible + control de versiones Git.' },
  'exp.pbb.2': { en: 'Lead RHEL 7/8 to RHEL 9 migration strategy and Satellite-based provisioning and software distribution.', es: 'Liderazgo de estrategia de migración RHEL 7/8 a RHEL 9 y aprovisionamiento/distribución de software basados en Satellite.' },
  'exp.pbb.3': { en: 'Operate Apache Tomcat and JBoss web environments for high-demand application workloads.', es: 'Operación de entornos web Apache Tomcat y JBoss para cargas de trabajo de alta demanda.' },
  'exp.pbb.4': { en: 'Own end-to-end patching and hardening cycles with compliance-oriented operational controls.', es: 'Gestión end-to-end de ciclos de parcheo y hardening con controles operativos orientados a cumplimiento.' },
  'exp.pbb.5': { en: 'Manage HA clusters and participate in DR plan execution/testing across distributed datacenters.', es: 'Gestión de clusters HA y participación en ejecución/pruebas de planes DR en datacenters distribuidos.' },
  'exp.pbb.6': { en: 'Drive VMware vSphere administration for provisioning, reconfiguration, and platform maintenance.', es: 'Administración de VMware vSphere para aprovisionamiento, reconfiguración y mantenimiento de plataforma.' },
  'exp.pbb.7': { en: 'Collaborate on GenAI business use cases with Azure AI Foundry and document intelligence pipelines.', es: 'Colaboración en casos de uso de negocio GenAI con Azure AI Foundry y pipelines de inteligencia documental.' },
  'exp.pbb.8': { en: 'Act as infrastructure consultant for application owners, translating requirements into delivery plans.', es: 'Consultoría de infraestructura para propietarios de aplicaciones, traduciendo requisitos en planes de entrega.' },
  'exp.sopra1.title': { en: 'Information Technology Application Specialist - Linux System Administrator · Sopra Steria', es: 'Especialista en Aplicaciones TI - Administrador de Sistemas Linux · Sopra Steria' },
  'exp.sopra1.subtitle': { en: 'Full-time · Hybrid · Madrid, Community of Madrid, Spain', es: 'Tiempo completo · Híbrido · Madrid, Comunidad de Madrid, España' },
  'exp.sopra1.period': { en: 'Nov 2023 - Jul 2025', es: 'Nov 2023 - Jul 2025' },
  'exp.sopra1.1': { en: 'Handled incidents, service requests, and change operations in ITSM-governed environments.', es: 'Gestión de incidencias, solicitudes de servicio y operaciones de cambio en entornos gobernados por ITSM.' },
  'exp.sopra1.2': { en: 'Supported Linux/Windows application platforms with strong troubleshooting and SLA execution.', es: 'Soporte de plataformas de aplicación Linux/Windows con troubleshooting sólido y ejecución de SLAs.' },
  'exp.sopra1.3': { en: 'Administered Active Directory connected workflows and operational support for enterprise users.', es: 'Administración de flujos conectados a Active Directory y soporte operativo para usuarios empresariales.' },
  'exp.sopra2.title': { en: 'Information Technology Application Specialist · Sopra Steria', es: 'Especialista en Aplicaciones TI · Sopra Steria' },
  'exp.sopra2.subtitle': { en: 'Full-time · Madrid, Community of Madrid, Spain', es: 'Tiempo completo · Madrid, Comunidad de Madrid, España' },
  'exp.sopra2.period': { en: 'Apr 2023 - Jan 2025', es: 'Abr 2023 - Ene 2025' },
  'exp.sopra2.1': { en: 'Delivered advanced technical support across multiple technologies in enterprise production contexts.', es: 'Soporte técnico avanzado en múltiples tecnologías en contextos de producción empresarial.' },
  'exp.sopra2.2': { en: 'Contributed to cloud-transition support initiatives and workplace modernization programs.', es: 'Contribución a iniciativas de transición a cloud y programas de modernización del puesto de trabajo.' },
  'exp.sopra2.3': { en: 'Worked across global collaboration environments with structured escalation and resolution flows.', es: 'Trabajo en entornos de colaboración global con flujos estructurados de escalado y resolución.' },
  'exp.intern.title': { en: 'Internship Trainee · Sopra Steria', es: 'Becario en Prácticas · Sopra Steria' },
  'exp.intern.subtitle': { en: 'Internship · Madrid, Community of Madrid, Spain', es: 'Prácticas · Madrid, Comunidad de Madrid, España' },
  'exp.intern.period': { en: 'Apr 2023 - Jun 2023', es: 'Abr 2023 - Jun 2023' },
  'exp.intern.1': { en: 'Built foundations in incident handling, directory services, and enterprise support workflows.', es: 'Construcción de bases en gestión de incidentes, servicios de directorio y flujos de soporte empresarial.' },

  /* ── About: Core areas ── */
  'skill.linux': { en: 'Linux Platform Engineering', es: 'Ingeniería de Plataformas Linux' },
  'skill.linux.desc': { en: 'RHEL lifecycle management, troubleshooting, kernel/system tuning, and operational reliability practices.', es: 'Gestión del ciclo de vida RHEL, troubleshooting, tuning de kernel/sistema y prácticas de fiabilidad operativa.' },
  'skill.auto': { en: 'Automation & Governance', es: 'Automatización y Gobernanza' },
  'skill.auto.desc': { en: 'Ansible playbooks, reusable role design, Git workflows, and evidence-based operational change controls.', es: 'Playbooks Ansible, diseño de roles reutilizables, flujos Git y controles de cambio operativo basados en evidencia.' },
  'skill.virt': { en: 'Virtualization & Datacenter Ops', es: 'Virtualización y Ops de Datacenter' },
  'skill.virt.desc': { en: 'VMware vSphere administration, server lifecycle tasks, HA awareness, and disaster-recovery execution.', es: 'Administración VMware vSphere, tareas de ciclo de vida de servidores, awareness HA y ejecución de disaster-recovery.' },
  'skill.mid': { en: 'Middleware Operations', es: 'Operaciones de Middleware' },
  'skill.mid.desc': { en: 'Apache Tomcat/JBoss environments, SSL and identity integrations, and performance-focused runtime support.', es: 'Entornos Apache Tomcat/JBoss, integraciones SSL e identidad, y soporte de runtime enfocado en rendimiento.' },
  'skill.cloud': { en: 'Cloud + AI Integration', es: 'Cloud + Integración IA' },
  'skill.cloud.desc': { en: 'Azure AI Foundry, document intelligence, and practical GenAI implementation patterns aligned with operations.', es: 'Azure AI Foundry, inteligencia documental y patrones prácticos de implementación GenAI alineados con operaciones.' },
  'skill.team': { en: 'Cross-Team Delivery', es: 'Entrega Cross-Team' },
  'skill.team.desc': { en: 'Stakeholder management, technical consulting for app owners, and requirement-to-platform translation.', es: 'Gestión de stakeholders, consultoría técnica para owners de aplicaciones y traducción de requisitos a plataforma.' },

  /* ── Category page ── */
  'catPage.published': { en: 'published', es: 'publicados' },
  'catPage.article': { en: 'article', es: 'artículo' },
  'catPage.articles': { en: 'articles', es: 'artículos' },
  'catPage.caseSummary': { en: 'Each post in this domain is written in case-study format: situation, issue, solution, usage context, and delivery impact.', es: 'Cada post en este dominio está escrito en formato de caso de estudio: situación, problema, solución, contexto de uso e impacto de entrega.' },
  'catPage.noPosts': { en: 'No posts in this category yet.', es: 'Sin posts en esta categoría aún.' },
  'catPage.searchPlaceholder': { en: 'Search posts...', es: 'Buscar posts...' },

  /* ── Post page ── */
  'post.caseSnapshot': { en: 'Case Snapshot', es: 'Resumen del Caso' },

  /* ── Boot ── */
  'boot.title': { en: 'Booting Engineer Runtime', es: 'Iniciando Runtime de Ingeniería' },
  'boot.hint': { en: 'Click to skip · Esc to continue instantly', es: 'Clic para saltar · Esc para continuar al instante' },
  'boot.gateLabel': { en: 'Type unlock to continue', es: 'Escribe unlock para continuar' },

  /* ── Command Palette ── */
  'palette.title': { en: 'Engineer Command Palette', es: 'Paleta de Comandos de Ingeniería' },
  'palette.searchPlaceholder': { en: 'Search commands... (mode, nav, boot)', es: 'Buscar comandos... (modo, nav, boot)' },
  'palette.close': { en: 'Close', es: 'Cerrar' },
  'palette.noMatch': { en: 'No command matched.', es: 'Ningún comando coincide.' },

  /* ── Command palette items (nav.js) ── */
  'cmd.goHome': { en: 'Go to Home', es: 'Ir a Inicio' },
  'cmd.goArchive': { en: 'Go to Archive', es: 'Ir a Archivo' },
  'cmd.goAbout': { en: 'Go to About', es: 'Ir a Acerca de' },
  'cmd.goRecruiter': { en: 'Go to Recruiter Snapshot', es: 'Ir a Resumen Recruiter' },
  'cmd.goTopology': { en: 'Go to Network Topology', es: 'Ir a Topología de Red' },
  'cmd.hardcoreEnable': { en: 'Enable Hardcore Mode', es: 'Activar Modo Hardcore' },
  'cmd.normalEnable': { en: 'Enable Normal Mode', es: 'Activar Modo Normal' },
  'cmd.recruiterSwitch': { en: 'Switch to Recruiter Mode', es: 'Cambiar a Modo Recruiter' },
  'cmd.engineerSwitch': { en: 'Switch to Engineer Mode', es: 'Cambiar a Modo Ingeniero' },
  'cmd.bootReplay': { en: 'Replay Boot Sequence', es: 'Repetir Secuencia de Arranque' },
  'cmd.bootGate': { en: 'Toggle Boot Unlock Gate', es: 'Alternar Puerta de Desbloqueo' },
  'cmd.switchLang': { en: 'Switch to Español', es: 'Switch to English' },
  'cmd.groupNav': { en: 'Navigation', es: 'Navegación' },
  'cmd.groupMode': { en: 'Mode', es: 'Modo' },
  'cmd.groupAudience': { en: 'Audience', es: 'Audiencia' },
  'cmd.groupSystem': { en: 'System', es: 'Sistema' },
  'cmd.groupLang': { en: 'Language', es: 'Idioma' },

  /* ── Toasts ── */
  'toast.hardcoreEnabled': { en: 'Hardcore mode enabled', es: 'Modo hardcore activado' },
  'toast.normalEnabled': { en: 'Normal mode enabled', es: 'Modo normal activado' },
  'toast.recruiterActive': { en: 'Recruiter mode active', es: 'Modo recruiter activo' },
  'toast.engineerActive': { en: 'Engineer mode active', es: 'Modo ingeniero activo' },
  'toast.bootGateEnabled': { en: 'Boot gate enabled', es: 'Puerta de arranque activada' },
  'toast.bootGateDisabled': { en: 'Boot gate disabled', es: 'Puerta de arranque desactivada' },
  'toast.langSwitched': { en: 'Switched to English', es: 'Cambiado a Español' },

  /* ── Metrics labels ── */
  'metric.host': { en: 'host', es: 'host' },
  'metric.automation': { en: 'automation', es: 'automatización' },
  'metric.aiMode': { en: 'ai mode', es: 'modo ia' },
  'metric.hostValue': { en: 'rhel-prod-09', es: 'rhel-prod-09' },
  'metric.automationValue': { en: 'ansible-playbook --check', es: 'ansible-playbook --check' },
  'metric.aiModeValue': { en: 'low-latency edge validation', es: 'validación edge de baja latencia' },

  /* ── Open Public CV (button label) ── */
  'cv.openPublic': { en: 'Open Public CV', es: 'Abrir CV Público' },

  /* ── Language switcher ── */
  'lang.switch': { en: 'ES', es: 'EN' },
  'lang.switchLabel': { en: 'Cambiar a Español', es: 'Switch to English' },
};

/* ═══════════════════════════════════════════════════════════════════════════
 *  Translation helper (server-side / Astro component usage)
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * At build time we always render English (static site).
 * Client-side, nav.js swaps text using data-i18n attributes + the dictionary.
 */
export function t(key: string, lang: Lang = DEFAULT_LANG): string {
  return dictionary[key]?.[lang] ?? dictionary[key]?.en ?? key;
}

/**
 * Returns the full dictionary for a given language — used to inject
 * `window.__i18n` for nav.js runtime translations.
 */
export function getDictForLang(lang: Lang): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, translations] of Object.entries(dictionary)) {
    result[key] = translations[lang] ?? translations.en ?? key;
  }
  return result;
}
