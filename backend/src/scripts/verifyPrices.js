const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ServiceCategory = mongoose.model('ServiceCategory', new mongoose.Schema({ name: String, slug: String, isActive: Boolean }));
  const Service = mongoose.model('Service', new mongoose.Schema({
    categoryId: mongoose.Schema.Types.ObjectId,
    name: String,
    basePrice: Number,
    originalPrice: Number,
    discountPercent: Number,
    serviceModesSupported: [String]
  }));

  const physioCat = await ServiceCategory.findOne({ slug: 'physiotherapy' });
  const otCat = await ServiceCategory.findOne({ slug: 'occupational-therapy' });

  const physioServices = await Service.find({ categoryId: physioCat._id });
  console.log('\n--- PHYSIOTHERAPY SERVICES (Target: ₹450) ---');
  physioServices.forEach(s => {
    console.log(`- ${s.name}: ₹${s.basePrice} (Original: ₹${s.originalPrice}, Discount: ${s.discountPercent}%, Modes: ${s.serviceModesSupported.join(',')})`);
  });

  const otServices = await Service.find({ categoryId: otCat._id });
  console.log('\n--- OCCUPATIONAL THERAPY SERVICES (Target: ₹550) ---');
  otServices.forEach(s => {
    console.log(`- ${s.name}: ₹${s.basePrice} (Original: ₹${s.originalPrice}, Discount: ${s.discountPercent}%, Modes: ${s.serviceModesSupported.join(',')})`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
