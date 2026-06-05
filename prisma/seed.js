const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const cars = [
  {
    externalId: 'mustang',
    brand: 'Ford',
    model: 'Mustang',
    year: 2024,
    pricePerDay: 350,
    fuelType: 'Benzyna',
    description: 'Coupe. Przebieg: 25 700 km. Moc: 258 KM. Ocena: 4,9.',
    latitude: 52.2350,
    longitude: 21.0000,
  },
  {
    externalId: 'audi',
    brand: 'Audi',
    model: 'Q5 Sportback',
    year: 2021,
    pricePerDay: 230,
    fuelType: 'Benzyna',
    description: 'SUV. Przebieg: 20 200 km. Moc: 275 KM. Ocena: 4,1.',
    latitude: 52.2220,
    longitude: 21.0180,
  },
  {
    externalId: 'suzuki',
    brand: 'Suzuki',
    model: 'Ertiga XL7',
    year: 2020,
    pricePerDay: 180,
    fuelType: 'Benzyna',
    description: 'Minivan. Przebieg: 34 200 km. Moc: 103 KM. Ocena: 4,6.',
    latitude: 52.2380,
    longitude: 21.0250,
  },
  {
    externalId: 'bmw',
    brand: 'BMW',
    model: '320i',
    year: 2023,
    pricePerDay: 290,
    fuelType: 'Benzyna',
    description: 'Sedan. Przebieg: 12 400 km. Moc: 184 KM. Ocena: 4,7.',
    latitude: 52.2270,
    longitude: 20.9950,
  },
  {
    externalId: 'toyota',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2022,
    pricePerDay: 200,
    fuelType: 'Hybryda',
    description: 'Sedan. Przebieg: 18 600 km. Moc: 140 KM. Ocena: 4,5.',
    latitude: 52.2190,
    longitude: 21.0300,
  },
  {
    externalId: 'mercedes',
    brand: 'Mercedes',
    model: 'C200',
    year: 2023,
    pricePerDay: 320,
    fuelType: 'Diesel',
    description: 'Sedan. Przebieg: 9 800 km. Moc: 204 KM. Ocena: 4,8.',
    latitude: 52.2410,
    longitude: 21.0080,
  },
  {
    externalId: 'vw',
    brand: 'Volkswagen',
    model: 'Golf',
    year: 2021,
    pricePerDay: 170,
    fuelType: 'Benzyna',
    description: 'Hatchback. Przebieg: 42 100 km. Moc: 150 KM. Ocena: 4,3.',
    latitude: 52.2150,
    longitude: 21.0050,
  },
];

const reviewsData = {
  mustang: [
    { name: 'Anna', stars: 5, text: 'Obs\u0142uga klienta na najwy\u017cszym poziomie' },
    { name: 'Marek', stars: 4, text: '' },
  ],
  audi: [
    { name: 'Sebastian', stars: 5, text: 'Auto by\u0142o super, warte ka\u017cdej minuty' },
    { name: 'Dmytro', stars: 4, text: 'by\u0142o dobrze, tylko czego\u015b brakowa\u0142o' },
  ],
  suzuki: [
    { name: 'Iza', stars: 5, text: 'Fajnie auto by\u0142o' },
    { name: 'Rafa\u0142', stars: 4, text: '' },
  ],
  bmw: [
    { name: 'Kacper', stars: 5, text: '\u015awietne prowadzenie, polecam!' },
    { name: 'Monika', stars: 5, text: 'Idealne na d\u0142u\u017csze trasy' },
  ],
  toyota: [
    { name: 'Pawe\u0142', stars: 5, text: 'Ekonomiczne i wygodne' },
    { name: 'Agnieszka', stars: 4, text: 'Dobre auto na co dzie\u0144' },
  ],
  mercedes: [
    { name: 'Tomasz', stars: 5, text: 'Luksus w ka\u017cdym calu' },
    { name: 'Katarzyna', stars: 5, text: '' },
  ],
  vw: [
    { name: 'Micha\u0142', stars: 4, text: 'Solidne auto, nic do zarzucenia' },
    { name: 'Ola', stars: 5, text: 'Kompaktowe i zwrotne w mie\u015bcie' },
  ],
};

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@rentcar.pl' },
    update: {},
    create: {
      name: 'Administrator',
      email: 'admin@rentcar.pl',
      password: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
    },
  });
  console.log('Admin:', admin.email);

  await prisma.review.deleteMany();
  const delB = await prisma.booking.deleteMany();
  const delC = await prisma.car.deleteMany();
  console.log('Wiped ' + delB.count + ' bookings, ' + delC.count + ' cars');

  const result = await prisma.car.createMany({
    data: cars.map(car => ({
      ...car,
      available: true,
      source: 'wheelyrent-local',
    })),
  });
  console.log('Seeded ' + result.count + ' local cars with coordinates');

  const allCars = await prisma.car.findMany({ orderBy: { createdAt: 'asc' } });

  for (const car of allCars) {
    const revs = reviewsData[car.externalId] || [];
    for (const rev of revs) {
      const ruser = await prisma.user.findFirst({ where: { name: rev.name } });
      const userId = ruser ? ruser.id : admin.id;
      await prisma.review.create({
        data: { carId: car.id, userId, stars: rev.stars, text: rev.text || null }
      });
    }
  }
  console.log('Reviews seeded');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
