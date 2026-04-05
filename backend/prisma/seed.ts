import { PrismaClient, Category, Zone } from '@prisma/client'

const prisma = new PrismaClient()

const products = [
  // Grains
  { name: 'Teff (White)', nameAm: 'ጤፍ (ነጭ)', category: Category.GRAINS, unit: 'kg', wholesalePrice: 55, retailPrice: 65, minOrderQty: 5 },
  { name: 'Teff (Brown)', nameAm: 'ጤፍ (ቡናማ)', category: Category.GRAINS, unit: 'kg', wholesalePrice: 50, retailPrice: 60, minOrderQty: 5 },
  { name: 'Wheat Flour', nameAm: 'ዱቄት', category: Category.GRAINS, unit: 'kg', wholesalePrice: 28, retailPrice: 35, minOrderQty: 10 },
  { name: 'Rice (Long Grain)', nameAm: 'ሩዝ', category: Category.GRAINS, unit: 'kg', wholesalePrice: 45, retailPrice: 55, minOrderQty: 5 },
  { name: 'Barley', nameAm: 'ገብስ', category: Category.GRAINS, unit: 'kg', wholesalePrice: 22, retailPrice: 28, minOrderQty: 10 },
  { name: 'Corn Flour', nameAm: 'የበቆሎ ዱቄት', category: Category.GRAINS, unit: 'kg', wholesalePrice: 20, retailPrice: 26, minOrderQty: 10 },

  // Oils & Fats
  { name: 'Sunflower Oil 1L', nameAm: 'የሱፍ ዘይት 1ሊ', category: Category.OILS_FATS, unit: 'bottle', wholesalePrice: 85, retailPrice: 100, minOrderQty: 6 },
  { name: 'Sunflower Oil 5L', nameAm: 'የሱፍ ዘይት 5ሊ', category: Category.OILS_FATS, unit: 'bottle', wholesalePrice: 400, retailPrice: 470, minOrderQty: 2 },
  { name: 'Butter (Niter Kibbeh)', nameAm: 'ቅቤ', category: Category.OILS_FATS, unit: 'kg', wholesalePrice: 280, retailPrice: 320, minOrderQty: 1 },

  // Cleaning
  { name: 'Soap Bar (Multipurpose)', nameAm: 'ሳሙና', category: Category.CLEANING, unit: 'piece', wholesalePrice: 12, retailPrice: 18, minOrderQty: 12 },
  { name: 'Washing Powder 1kg', nameAm: 'የልብስ ዱቄት', category: Category.CLEANING, unit: 'pack', wholesalePrice: 55, retailPrice: 70, minOrderQty: 6 },
  { name: 'Dish Soap 500ml', nameAm: 'የሳህን ሳሙና', category: Category.CLEANING, unit: 'bottle', wholesalePrice: 30, retailPrice: 40, minOrderQty: 6 },

  // Beverages
  { name: 'Sugar 1kg', nameAm: 'ስኳር 1ኪ', category: Category.BEVERAGES, unit: 'pack', wholesalePrice: 55, retailPrice: 65, minOrderQty: 5 },
  { name: 'Sugar 5kg', nameAm: 'ስኳር 5ኪ', category: Category.BEVERAGES, unit: 'pack', wholesalePrice: 260, retailPrice: 300, minOrderQty: 2 },
  { name: 'Tea Leaves 100g', nameAm: 'ሻይ', category: Category.BEVERAGES, unit: 'pack', wholesalePrice: 35, retailPrice: 45, minOrderQty: 6 },
  { name: 'Coffee (Ground) 250g', nameAm: 'ቡና', category: Category.BEVERAGES, unit: 'pack', wholesalePrice: 120, retailPrice: 150, minOrderQty: 3 },

  // Dairy
  { name: 'Milk 1L (UHT)', nameAm: 'ወተት 1ሊ', category: Category.DAIRY, unit: 'carton', wholesalePrice: 45, retailPrice: 55, minOrderQty: 6 },
  { name: 'Yogurt 500ml', nameAm: 'እርጎ', category: Category.DAIRY, unit: 'cup', wholesalePrice: 30, retailPrice: 40, minOrderQty: 6 },

  // Spices
  { name: 'Berbere 250g', nameAm: 'በርበሬ', category: Category.SPICES, unit: 'pack', wholesalePrice: 60, retailPrice: 80, minOrderQty: 3 },
  { name: 'Mitmita 100g', nameAm: 'ሚጥሚጣ', category: Category.SPICES, unit: 'pack', wholesalePrice: 45, retailPrice: 60, minOrderQty: 3 },
  { name: 'Turmeric 100g', nameAm: 'ኩርኩም', category: Category.SPICES, unit: 'pack', wholesalePrice: 25, retailPrice: 35, minOrderQty: 6 },
  { name: 'Salt 1kg', nameAm: 'ጨው', category: Category.SPICES, unit: 'pack', wholesalePrice: 10, retailPrice: 15, minOrderQty: 10 },

  // Snacks
  { name: 'Biscuits (Assorted)', nameAm: 'ቢስኩት', category: Category.SNACKS, unit: 'pack', wholesalePrice: 20, retailPrice: 28, minOrderQty: 12 },
  { name: 'Chewing Gum (Box)', nameAm: 'ቺዊንግ ጋም', category: Category.SNACKS, unit: 'box', wholesalePrice: 30, retailPrice: 40, minOrderQty: 6 },
]

async function main() {
  console.log('🌱 Seeding database...')

  // Seed products
  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.name },
      update: product,
      create: product,
    })
  }
  console.log(`✅ Seeded ${products.length} products`)

  // Seed admin user
  const admin = await prisma.user.upsert({
    where: { phone: '+251900000000' },
    update: {},
    create: { phone: '+251900000000', role: 'ADMIN' },
  })
  console.log(`✅ Admin user: ${admin.phone}`)

  // Seed test shop
  const shopUser = await prisma.user.upsert({
    where: { phone: '+251911111111' },
    update: {},
    create: {
      phone: '+251911111111',
      role: 'SHOP_OWNER',
      shop: {
        create: {
          ownerName: 'Abebe Kebede',
          shopName: 'Abebe Mini Market',
          phone: '+251911111111',
          zone: Zone.BOLE,
          address: 'Bole Road, near Edna Mall',
          lat: 8.9806,
          lng: 38.7578,
          isVerified: true,
          creditScore: 65,
          creditLimit: 5000,
        },
      },
    },
  })
  console.log(`✅ Test shop owner: ${shopUser.phone}`)

  // Seed test driver
  const driverUser = await prisma.user.upsert({
    where: { phone: '+251922222222' },
    update: {},
    create: {
      phone: '+251922222222',
      role: 'DRIVER',
      driver: {
        create: {
          name: 'Dawit Haile',
          phone: '+251922222222',
          vehicle: 'Isuzu NPR',
          plateNo: 'AA-3-12345',
        },
      },
    },
  })
  console.log(`✅ Test driver: ${driverUser.phone}`)

  console.log('🎉 Seed complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
