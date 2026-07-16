import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Idempotent seed: wipe tenant data and recreate it.
  await prisma.restaurant.deleteMany();

  const trattoria = await prisma.restaurant.create({
    data: {
      name: 'Trattoria Bella',
      slug: 'trattoria-bella',
      timezone: 'Europe/Rome',
      currency: 'EUR',
      address: 'Via Roma 12, Milan',
      phone: '+39 02 1234 5678',
      users: {
        create: [
          {
            email: 'owner@trattoria-bella.example',
            name: 'Giulia Rossi',
            role: 'OWNER',
          },
          {
            email: 'staff@trattoria-bella.example',
            name: 'Marco Bianchi',
            role: 'STAFF',
          },
        ],
      },
      tables: {
        create: [
          { number: 1, capacity: 2, location: 'window' },
          { number: 2, capacity: 2, location: 'window' },
          { number: 3, capacity: 4, location: 'main room' },
          { number: 4, capacity: 4, location: 'main room' },
          { number: 5, capacity: 6, location: 'terrace' },
        ],
      },
      menuItems: {
        create: [
          {
            name: 'Bruschetta',
            category: 'starters',
            priceCents: 850,
            description: 'Grilled bread, tomatoes, basil',
          },
          {
            name: 'Margherita',
            category: 'pizza',
            priceCents: 1200,
            description: 'Tomato, mozzarella, basil',
          },
          {
            name: 'Tagliatelle al ragù',
            category: 'pasta',
            priceCents: 1550,
          },
          {
            name: 'Tiramisù',
            category: 'desserts',
            priceCents: 700,
          },
          {
            name: 'House red (glass)',
            category: 'drinks',
            priceCents: 600,
          },
        ],
      },
    },
  });

  const diner = await prisma.restaurant.create({
    data: {
      name: 'Harbor Diner',
      slug: 'harbor-diner',
      timezone: 'America/New_York',
      currency: 'USD',
      address: '48 Pier Ave, Portland, ME',
      phone: '+1 (207) 555-0148',
      users: {
        create: [
          {
            email: 'owner@harbor-diner.example',
            name: 'Sam Carter',
            role: 'OWNER',
          },
        ],
      },
      tables: {
        create: [
          { number: 1, capacity: 2, location: 'counter' },
          { number: 2, capacity: 4, location: 'booth' },
          { number: 3, capacity: 4, location: 'booth' },
          { number: 4, capacity: 8, location: 'back room' },
        ],
      },
      menuItems: {
        create: [
          {
            name: 'Lobster roll',
            category: 'mains',
            priceCents: 2400,
            description: 'Maine lobster, brioche bun',
          },
          {
            name: 'Clam chowder',
            category: 'starters',
            priceCents: 950,
          },
          {
            name: 'Fish & chips',
            category: 'mains',
            priceCents: 1800,
          },
          {
            name: 'Blueberry pie',
            category: 'desserts',
            priceCents: 750,
          },
          {
            name: 'Drip coffee',
            category: 'drinks',
            priceCents: 300,
          },
        ],
      },
    },
  });

  console.log(
    `Seeded restaurants: ${trattoria.name} (${trattoria.id}), ${diner.name} (${diner.id})`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
