export interface ResourceSection {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface ResourceArticle {
  slug: string;
  title: string;
  summary: string;
  tag: string;
  updatedAt: string;
  sections: ResourceSection[];
}

export const RESOURCES: ResourceArticle[] = [
  {
    slug: 'primeras-resenas',
    title: 'Guía para conseguir tus primeras reseñas',
    summary: 'Cómo pedir opiniones sin presionar, qué enlaces usar y cómo medir la conversión.',
    tag: 'Guía',
    updatedAt: '2026-01-15',
    sections: [
      {
        title: 'Pide opiniones después de un buen servicio',
        paragraphs: [
          'El mejor momento para pedir una reseña es justo después de resolver una necesidad del cliente, cuando la experiencia todavía está fresca. Evita pedirla durante una incidencia abierta o antes de entregar el trabajo.',
          'Usa un mensaje breve, explica para qué sirve la opinión y deja claro que no hay contraprestación. La transparencia reduce el rechazo y mejora la calidad de las respuestas.',
        ],
      },
      {
        title: 'Usa enlaces personalizados',
        paragraphs: [
          'Los enlaces de solicitud de FIVERTEN rellenan el nombre y el correo del cliente. Eso reduce la fricción y permite saber qué solicitudes terminaron en reseña.',
        ],
        bullets: [
          'Crea una solicitud por cliente desde el panel.',
          'Comparte el enlace por el mismo canal por el que prestaste el servicio.',
          'No reenvíes el mismo enlace: cada solicitud es de un solo uso.',
          'Revisa las métricas de enviadas, abiertas y completadas.',
        ],
      },
      {
        title: 'Mide sin presionar',
        paragraphs: [
          'La conversión no depende solo del volumen. Una base pequeña de clientes satisfechos suele generar mejores reseñas que un envío masivo sin contexto. Empieza con clientes recientes y analiza qué mensajes funcionan mejor.',
        ],
      },
    ],
  },
  {
    slug: 'responder-resena-negativa',
    title: 'Cómo responder a una reseña negativa',
    summary: 'Buenas prácticas para responder en público y abrir una resolución cuando proceda.',
    tag: 'Guía',
    updatedAt: '2026-01-15',
    sections: [
      {
        title: 'Responde con hechos, no con defensas',
        paragraphs: [
          'Agradece el tiempo que el cliente ha dedicado a escribir. Reconoce el problema sin entrar en discusiones personales y explica qué vas a hacer para revisarlo.',
          'No publiques datos personales, números de pedido completos ni información interna. Si necesitas detalles, pide al cliente que continúe por un canal privado.',
        ],
      },
      {
        title: 'Cuándo abrir una resolución',
        paragraphs: [
          'Si la reseña describe un problema concreto que puedes corregir, abre una resolución desde el panel. El cliente podrá conversar contigo y aceptar una solución.',
          'La resolución no elimina la reseña: documenta el intento de arreglo y puede mejorar la percepción pública del caso.',
        ],
      },
      {
        title: 'Qué no hacer',
        bullets: [
          'No ofrezcas compensaciones a cambio de cambiar la valoración.',
          'No acuses al cliente de mentir sin pruebas.',
          'No pidas a otras personas que publiquen reseñas para compensar.',
          'No intentes ocultar la reseña: solo la moderación independiente puede retirarla.',
        ],
      },
    ],
  },
  {
    slug: 'que-significa-el-sello',
    title: 'Qué significa el sello FIVERTEN',
    summary: 'Categorías verificadas, validez, caducidad y cómo se muestra el sello en tu web.',
    tag: 'Confianza',
    updatedAt: '2026-01-15',
    sections: [
      {
        title: 'Qué comprueba FIVERTEN',
        paragraphs: [
          'El sello indica que FIVERTEN ha revisado la identidad del representante, la documentación fiscal, el domicilio y al menos un proyecto o evidencia de actividad.',
          'La empresa no puede autoverificarse. Un revisor de FIVERTEN aprueba, rechaza o revoca la verificación con un motivo registrado.',
        ],
      },
      {
        title: 'Validez y caducidad',
        paragraphs: [
          'La verificación tiene una fecha de validez. Cuando caduca o se revoca, el sello dinámico cambia automáticamente y deja de mostrar el estado verificado.',
          'La empresa puede solicitar la renovación antes del vencimiento. Si la renovación se rechaza, el sello vigente anterior se mantiene hasta su fecha de caducidad.',
        ],
      },
      {
        title: 'Cómo insertarlo',
        paragraphs: [
          'Desde el panel puedes descargar el sello en PNG o SVG y copiar un código HTML. El código apunta al perfil público de la empresa, de modo que cualquier visitante puede comprobar el estado real.',
        ],
      },
    ],
  },
  {
    slug: 'widgets-y-qr',
    title: 'Widgets y QR para tu web',
    summary: 'Inserta tu puntuación, opiniones recientes o un QR para pedir reseñas en tu negocio.',
    tag: 'Producto',
    updatedAt: '2026-01-15',
    sections: [
      {
        title: 'Widgets de reputación',
        paragraphs: [
          'El widget muestra la puntuación y las reseñas publicadas de tu empresa sin que tengas que copiarlas manualmente. Se actualiza cuando cambia la reputación.',
          'Colócalo en una zona visible de tu web, como la página de inicio o la de contacto, y enlaza siempre al perfil público para que el visitante pueda comprobar el origen.',
        ],
      },
      {
        title: 'QR para pedir reseñas',
        paragraphs: [
          'El QR es útil en tiendas, oficinas, restaurantes o ferias. Dirige al formulario público de reseña de tu empresa y puede combinarse con un enlace personalizado.',
        ],
        bullets: [
          'Descarga el QR en alta resolución.',
          'Colócalo en un lugar accesible y con una llamada a la acción clara.',
          'No lo uses para incentivar reseñas falsas.',
          'Revisa periódicamente que el enlace sigue activo.',
        ],
      },
    ],
  },
  {
    slug: 'politica-de-moderacion',
    title: 'Política de moderación',
    summary: 'Motivos de reporte, señales antifraude y cómo se revisan las opiniones reportadas.',
    tag: 'Política',
    updatedAt: '2026-01-15',
    sections: [
      {
        title: 'Qué se puede reportar',
        bullets: [
          'Contenido difamatorio, amenazas o datos personales.',
          'Spam, publicidad o enlaces irrelevantes.',
          'Reseñas que no describen una experiencia real.',
          'Suplantación de identidad o conflicto de interés no declarado.',
        ],
      },
      {
        title: 'Cómo se revisa',
        paragraphs: [
          'Cada reporte queda registrado con su motivo y estado. La moderación revisa el contexto de la reseña, el historial de la cuenta y las pruebas disponibles antes de decidir.',
          'Las empresas pueden responder públicamente, pero no ocultar ni editar reseñas por sí mismas. Las decisiones de moderación quedan auditadas.',
        ],
      },
      {
        title: 'Señales antifraude',
        paragraphs: [
          'FIVERTEN aplica límites por IP, detección de enlaces, verificación de correo y revisión de reseñas de baja valoración. Estas señales no condenan automáticamente una opinión: sirven para priorizar la revisión humana.',
        ],
      },
    ],
  },
  {
    slug: 'planes-y-limites',
    title: 'Planes y límites',
    summary: 'Compara usuarios, reseñas incluidas y funciones disponibles en cada plan.',
    tag: 'Planes',
    updatedAt: '2026-01-15',
    sections: [
      {
        title: 'Qué cambia entre planes',
        paragraphs: [
          'Todos los planes incluyen perfil público, recepción de reseñas y solicitud de verificación. Los límites se aplican al número de usuarios del equipo y al volumen de reseñas incluidas.',
          'Las funciones de QR, widgets y resolución de incidencias dependen del plan contratado. Puedes consultar el detalle actualizado en la página de precios.',
        ],
      },
      {
        title: 'Límites y cambios de plan',
        paragraphs: [
          'Si alcanzas el límite de usuarios o reseñas, la plataforma te avisa antes de bloquear nuevas altas. Puedes cambiar de plan desde Mi plan; el cambio se aplica a la suscripción de la empresa.',
          'La verificación no se compra: está incluida en todos los planes y siempre requiere revisión de FIVERTEN.',
        ],
      },
    ],
  },
];

export function resourceBySlug(slug: string): ResourceArticle | undefined {
  return RESOURCES.find((resource) => resource.slug === slug);
}
