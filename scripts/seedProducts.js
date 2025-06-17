const firebase = require('../config/firebase');

const products = [
  // Productos escolares y papelería
  {
    name: 'Cuaderno universitario 100 hojas',
    description: 'Cuaderno tamaño carta, rayado, 100 hojas',
    price: 2500,
    brand: 'Torre',
    quality_category: 'economico',
    stock: 50
  },
  {
    name: 'Lápiz grafito HB',
    description: 'Lápiz de grafito, tipo HB, ideal para escribir y dibujar',
    price: 300,
    brand: 'Faber-Castell',
    quality_category: 'economico',
    stock: 200
  },
  {
    name: 'Goma de borrar blanca',
    description: 'Goma de borrar suave, no mancha',
    price: 250,
    brand: 'Pelikan',
    quality_category: 'economico',
    stock: 120
  },
  {
    name: 'Regla de 30cm',
    description: 'Regla plástica transparente de 30cm',
    price: 600,
    brand: 'Maped',
    quality_category: 'intermedio',
    stock: 80
  },
  {
    name: 'Tijeras escolares',
    description: 'Tijeras con punta redonda para niños',
    price: 900,
    brand: 'Norma',
    quality_category: 'intermedio',
    stock: 60
  },
  {
    name: 'Pegamento en barra',
    description: 'Pegamento en barra no tóxico, 21g',
    price: 700,
    brand: 'Pritt',
    quality_category: 'intermedio',
    stock: 100
  },
  {
    name: 'Mochila escolar',
    description: 'Mochila resistente, varios compartimentos',
    price: 12000,
    brand: 'Totto',
    quality_category: 'calidad',
    stock: 30
  },
  {
    name: 'Estuche para lápices',
    description: 'Estuche con cierre, capacidad para 30 lápices',
    price: 1800,
    brand: 'Faber-Castell',
    quality_category: 'intermedio',
    stock: 70
  },
  {
    name: 'Bolígrafo azul',
    description: 'Bolígrafo tinta azul, trazo suave',
    price: 350,
    brand: 'BIC',
    quality_category: 'economico',
    stock: 300
  },
  {
    name: 'Bolígrafo rojo',
    description: 'Bolígrafo tinta roja, trazo suave',
    price: 350,
    brand: 'BIC',
    quality_category: 'economico',
    stock: 200
  },
  {
    name: 'Bolígrafo negro',
    description: 'Bolígrafo tinta negra, trazo suave',
    price: 350,
    brand: 'BIC',
    quality_category: 'economico',
    stock: 200
  },
  {
    name: 'Resaltador amarillo',
    description: 'Resaltador color amarillo, punta biselada',
    price: 800,
    brand: 'Stabilo',
    quality_category: 'intermedio',
    stock: 90
  },
  {
    name: 'Calculadora científica',
    description: 'Calculadora científica 240 funciones',
    price: 8500,
    brand: 'Casio',
    quality_category: 'calidad',
    stock: 25
  },
  {
    name: 'Compás de dibujo',
    description: 'Compás metálico para dibujo técnico',
    price: 2200,
    brand: 'Staedtler',
    quality_category: 'calidad',
    stock: 40
  },
  {
    name: 'Transportador 180°',
    description: 'Transportador plástico transparente',
    price: 500,
    brand: 'Maped',
    quality_category: 'intermedio',
    stock: 60
  },
  {
    name: 'Escuadra 45°',
    description: 'Escuadra plástica 45 grados',
    price: 700,
    brand: 'Maped',
    quality_category: 'intermedio',
    stock: 60
  },
  {
    name: 'Cartulina blanca',
    description: 'Cartulina tamaño carta, color blanco',
    price: 200,
    brand: 'Norma',
    quality_category: 'economico',
    stock: 150
  },
  {
    name: 'Sacapuntas metálico',
    description: 'Sacapuntas de metal, resistente',
    price: 400,
    brand: 'Faber-Castell',
    quality_category: 'intermedio',
    stock: 100
  },
  {
    name: 'Agenda escolar',
    description: 'Agenda con calendario y horarios',
    price: 3500,
    brand: 'Norma',
    quality_category: 'calidad',
    stock: 40
  },
  {
    name: 'Cuaderno profesional 200 hojas',
    description: 'Cuaderno grande, 200 hojas, tapa dura',
    price: 4200,
    brand: 'Torre',
    quality_category: 'calidad',
    stock: 35
  },
  // Productos de tecnología
  {
    name: 'Pendrive 32GB',
    description: 'Memoria USB 32GB, alta velocidad',
    price: 6500,
    brand: 'Kingston',
    quality_category: 'intermedio',
    stock: 60
  },
  {
    name: 'Mouse inalámbrico',
    description: 'Mouse óptico inalámbrico, USB',
    price: 7800,
    brand: 'Logitech',
    quality_category: 'calidad',
    stock: 40
  },
  {
    name: 'Teclado multimedia',
    description: 'Teclado con teclas multimedia y diseño ergonómico',
    price: 9500,
    brand: 'Genius',
    quality_category: 'intermedio',
    stock: 30
  },
  {
    name: 'Audífonos diadema',
    description: 'Audífonos con micrófono, cómodos para estudio',
    price: 12000,
    brand: 'Sony',
    quality_category: 'calidad',
    stock: 25
  },
  // Productos de arte
  {
    name: 'Set de acuarelas',
    description: 'Acuarelas escolares, 12 colores',
    price: 2200,
    brand: 'Pelikan',
    quality_category: 'intermedio',
    stock: 50
  },
  {
    name: 'Pinceles para pintura',
    description: 'Set de 5 pinceles variados',
    price: 1800,
    brand: 'Winsor & Newton',
    quality_category: 'calidad',
    stock: 30
  },
  {
    name: 'Block de dibujo',
    description: 'Block de hojas blancas para dibujo artístico',
    price: 2100,
    brand: 'Liderpapel',
    quality_category: 'intermedio',
    stock: 40
  },
  {
    name: 'Lápices de colores',
    description: 'Set de 24 lápices de colores',
    price: 3200,
    brand: 'Faber-Castell',
    quality_category: 'calidad',
    stock: 60
  },
  {
    name: 'Marcadores permanentes',
    description: 'Set de 4 marcadores de colores',
    price: 1800,
    brand: 'Sharpie',
    quality_category: 'intermedio',
    stock: 80
  },
  // Otros productos útiles
  {
    name: 'Corrector líquido',
    description: 'Corrector blanco líquido, secado rápido',
    price: 900,
    brand: 'Pelikan',
    quality_category: 'economico',
    stock: 70
  },
  {
    name: 'Carpeta con anillos',
    description: 'Carpeta plástica con 2 anillos metálicos',
    price: 1700,
    brand: 'Norma',
    quality_category: 'intermedio',
    stock: 55
  },
  {
    name: 'Papel lustre',
    description: 'Set de 10 hojas de papel lustre de colores',
    price: 600,
    brand: 'Liderpapel',
    quality_category: 'economico',
    stock: 90
  },
  {
    name: 'Cinta adhesiva',
    description: 'Cinta adhesiva transparente, 18mm x 30m',
    price: 500,
    brand: '3M',
    quality_category: 'intermedio',
    stock: 100
  },
  {
    name: 'Grapadora pequeña',
    description: 'Grapadora metálica para escritorio',
    price: 2500,
    brand: 'Maped',
    quality_category: 'intermedio',
    stock: 35
  },
  {
    name: 'Caja de clips',
    description: 'Caja con 100 clips metálicos',
    price: 700,
    brand: 'Norma',
    quality_category: 'economico',
    stock: 120
  },
  {
    name: 'Papel fotocopia',
    description: 'Resma de 500 hojas tamaño carta',
    price: 4200,
    brand: 'Chamex',
    quality_category: 'intermedio',
    stock: 60
  }
];

async function seed() {
  for (const product of products) {
    await firebase.db.collection('products').add(product);
    console.log(`Producto agregado: ${product.name}`);
  }
  process.exit();
}

seed(); 