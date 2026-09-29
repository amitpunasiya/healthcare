const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  const ServiceCategory = mongoose.model('ServiceCategory', new mongoose.Schema({ name: String, slug: String, isActive: Boolean }));
  const Service = mongoose.model('Service', new mongoose.Schema({
    categoryId: mongoose.Schema.Types.ObjectId,
    name: String,
    description: String,
    basePrice: Number,
    originalPrice: Number,
    discountPercent: Number,
    durationMinutes: Number,
    serviceModesSupported: [String],
    engagementTypesSupported: [String],
    isActive: Boolean
  }));

  const physioCat = await ServiceCategory.findOne({ slug: 'physiotherapy' });
  const otCat = await ServiceCategory.findOne({ slug: 'occupational-therapy' });
  const elderCat = await ServiceCategory.findOne({ slug: 'elder-care' });

  console.log('Categories found:', {
    physio: physioCat?._id,
    ot: otCat?._id,
    elder: elderCat?._id
  });

  // 1. Update / Upsert Physiotherapy Services (Base Price: 450, Original Price: 600, 25% OFF)
  const physioServices = [
    { name: 'Home Physiotherapy', description: 'Full physiotherapy sessions delivered at your doorstep.', durationMinutes: 60 },
    { name: 'Geriatric Physiotherapy', description: 'Mobility and strength care for the elderly.', durationMinutes: 60 },
    { name: 'Pain Management', description: 'Evidence-based relief for chronic pain.', durationMinutes: 45 },
    { name: 'Joint & Back Pain', description: 'Targeted therapy for knees, hips and spine.', durationMinutes: 60 },
    { name: 'Sports Injury Rehab', description: 'Return-to-play plans for athletes.', durationMinutes: 60 },
    { name: 'Hand Therapy', description: 'Fine motor recovery and splinting.', durationMinutes: 45 },
    { name: 'Balance & Fall Prevention', description: 'Gait training and balance work.', durationMinutes: 50 },
    { name: 'Orthopedic Physiotherapy Session', description: 'Comprehensive orthopedic care and musculoskeletal rehabilitation.', durationMinutes: 60 }
  ];

  for (const s of physioServices) {
    await Service.findOneAndUpdate(
      { name: s.name },
      {
        categoryId: physioCat._id,
        name: s.name,
        description: s.description,
        basePrice: 450,
        originalPrice: 600,
        discountPercent: 25,
        durationMinutes: s.durationMinutes,
        serviceModesSupported: ['HOME_VISIT'],
        engagementTypesSupported: ['ONE_TIME', 'REGULAR_RECURRING'],
        isActive: true
      },
      { upsert: true, new: true }
    );
  }

  if (physioCat) {
    await Service.updateMany(
      { $or: [{ categoryId: physioCat._id }, { name: /physio/i }] },
      { $set: { basePrice: 450, originalPrice: 600, discountPercent: 25, serviceModesSupported: ['HOME_VISIT'] } }
    );
  }
  console.log('All Physiotherapy services set to Rs 450 with 25% discount.');

  // 2. Update / Upsert Occupational Therapy Services (Base Price: 550, Original Price: 750, 27% OFF)
  const otServices = [
    { name: 'Occupational Therapy', description: 'Regain independence in everyday activities.', durationMinutes: 60 },
    { name: 'Pediatric Occupational Therapy', description: "Therapy focused on children's developmental and everyday functional skills.", durationMinutes: 60 },
    { name: 'Hand & Fine Motor Therapy', description: 'Improve hand function, coordination and fine motor skills.', durationMinutes: 50 },
    { name: 'Activities of Daily Living Training', description: 'Support independence in dressing, eating, grooming and everyday activities.', durationMinutes: 60 },
    { name: 'Sensory Integration Therapy', description: 'Support sensory processing, regulation and functional participation.', durationMinutes: 60 },
    { name: 'Cognitive & Functional Rehabilitation', description: 'Improve cognitive and functional skills needed for everyday activities.', durationMinutes: 60 }
  ];

  for (const s of otServices) {
    await Service.findOneAndUpdate(
      { name: s.name },
      {
        categoryId: otCat._id,
        name: s.name,
        description: s.description,
        basePrice: 550,
        originalPrice: 750,
        discountPercent: 27,
        durationMinutes: s.durationMinutes,
        serviceModesSupported: ['HOME_VISIT'],
        engagementTypesSupported: ['ONE_TIME', 'REGULAR_RECURRING'],
        isActive: true
      },
      { upsert: true, new: true }
    );
  }

  if (otCat) {
    await Service.updateMany(
      { $or: [{ categoryId: otCat._id }, { name: /occupational/i }] },
      { $set: { basePrice: 550, originalPrice: 750, discountPercent: 27, serviceModesSupported: ['HOME_VISIT'] } }
    );
  }
  console.log('All Occupational Therapy services set to Rs 550 with 27% discount.');

  // 3. Update / Upsert Elder Care Services
  const elderServices = [
    { name: 'Senior Companion & Caregiver', description: 'Assistance with daily living activities (bathing, dressing, meals, mobility, medication reminders).', basePrice: 1100, originalPrice: 1375, discountPercent: 20, durationMinutes: 240 },
    { name: 'Geriatric Nursing & Wound Care', description: 'Catheter care, bed sore treatment, IV drip management, and vital checks for elderly patients.', basePrice: 1400, originalPrice: 1750, discountPercent: 20, durationMinutes: 60 }
  ];

  for (const s of elderServices) {
    await Service.findOneAndUpdate(
      { name: s.name },
      {
        categoryId: elderCat._id,
        name: s.name,
        description: s.description,
        basePrice: s.basePrice,
        originalPrice: s.originalPrice,
        discountPercent: s.discountPercent,
        durationMinutes: s.durationMinutes,
        serviceModesSupported: ['HOME_VISIT'],
        engagementTypesSupported: ['ONE_TIME', 'REGULAR_RECURRING'],
        isActive: true
      },
      { upsert: true, new: true }
    );
  }
  console.log('Elder care services updated.');

  // 4. Update any remaining services without discounts
  const allServices = await Service.find();
  let updatedCount = 0;
  for (const s of allServices) {
    if (!s.originalPrice || s.originalPrice <= s.basePrice) {
      s.originalPrice = Math.round(s.basePrice / 0.8);
      s.discountPercent = 20;
      await s.save();
      updatedCount++;
    }
  }
  console.log(`Discounts ensured across all services. Additional services updated: ${updatedCount}`);

  // 5. Update existing provider profile charges
  const ProviderProfile = mongoose.model('ProviderProfile', new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    category: mongoose.Schema.Types.ObjectId,
    chargesPerSession: Number
  }));

  if (physioCat) {
    await ProviderProfile.updateMany({ category: physioCat._id }, { $set: { chargesPerSession: 450 } });
  }
  if (otCat) {
    await ProviderProfile.updateMany({ category: otCat._id }, { $set: { chargesPerSession: 550 } });
  }
  await ProviderProfile.updateMany(
    { $or: [{ category: { $exists: false } }, { category: null }] },
    { $set: { chargesPerSession: 450 } }
  );
  console.log('Provider profile charges updated successfully.');

  // Summary verification
  const pCount = await Service.countDocuments({ categoryId: physioCat._id, basePrice: 450 });
  const otCount = await Service.countDocuments({ categoryId: otCat._id, basePrice: 550 });
  console.log(`Verification: Physio @ 450 count = ${pCount}, OT @ 550 count = ${otCount}`);

  await mongoose.disconnect();
  console.log('Migration completed successfully.');
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
