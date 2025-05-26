const { Category } = require('../src/models/Category');

async function seed() {
  try {
    await Category.seedDefaults();
    console.log('✅ Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();