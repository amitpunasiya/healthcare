import { Request, Response, NextFunction } from 'express';
import ServiceCategory from '../models/ServiceCategory';
import Service from '../models/Service';
import LabProfile from '../models/LabProfile';
import { ServiceMode, EngagementType } from '../constants/enums';
import { rawLabTestsCatalog } from '../data/labTestsCatalog';

// Auto-seed and update default categories & sub-services idempotently
export const seedDefaultServices = async () => {
  try {
    console.log('[Seed] Ensuring Healthcare Service Categories & Sub-Services...');

    const defaultCategories = [
      {
        name: 'Physiotherapy',
        slug: 'physiotherapy',
        description: 'Physical therapy for movement restoration, rehabilitation, pain management, and mobility enhancement.',
        iconName: 'Activity',
        displayOrder: 1,
      },
      {
        name: 'Occupational Therapy',
        slug: 'occupational-therapy',
        description: 'Therapy helping individuals regain daily living skills, motor coordination, and workplace adaptability.',
        iconName: 'HeartHandshake',
        displayOrder: 2,
      },
      {
        name: 'Elder Care',
        slug: 'elder-care',
        description: 'Compassionate senior care, geriatric nursing, daily living assistance, and companion care.',
        iconName: 'UserCheck',
        displayOrder: 3,
      },
      {
        name: 'Lab Test',
        slug: 'lab-test',
        description: 'Comprehensive diagnostic blood panels, pathology testing, and home sample collection.',
        iconName: 'FlaskConical',
        displayOrder: 4,
      },
    ];

    const catMap: { [key: string]: any } = {};

    for (const catData of defaultCategories) {
      let query: any = { $or: [{ slug: catData.slug }, { name: catData.name }] };
      if (catData.slug === 'lab-test') {
        query = {
          $or: [
            { slug: 'lab-test' },
            { slug: 'lab-tests' },
            { name: 'Lab Test' },
            { name: 'Lab Tests' },
          ],
        };
      }

      let cat = await ServiceCategory.findOne(query);

      if (!cat) {
        cat = await ServiceCategory.create({ ...catData, isActive: true });
      } else {
        cat.name = catData.name;
        cat.slug = catData.slug;
        cat.isActive = true;
        cat.description = catData.description;
        cat.displayOrder = catData.displayOrder;
        await cat.save();
      }
      catMap[catData.slug] = cat._id;
      if (catData.slug === 'lab-test') {
        catMap['lab-tests'] = cat._id;
      }
    }

    // Cleanup & deactivate any legacy duplicate Lab Test category documents
    const canonicalLabId = catMap['lab-test'];
    if (canonicalLabId) {
      const duplicateCats = await ServiceCategory.find({
        _id: { $ne: canonicalLabId },
        $or: [
          { slug: 'lab-tests' },
          { slug: 'lab-test' },
          { name: /^lab/i },
        ],
      });

      for (const dupCat of duplicateCats) {
        await Service.updateMany(
          { categoryId: dupCat._id },
          { $set: { categoryId: canonicalLabId } }
        );
        dupCat.isActive = false;
        await dupCat.save();
      }
    }

    // 1. Physiotherapy Services (ALL set to ₹450 with 25% discount from ₹600)
    const physioServices = [
      {
        name: 'Home Physiotherapy',
        description: 'Full physiotherapy sessions delivered at your doorstep.',
        basePrice: 450,
        originalPrice: 600,
        discountPercent: 25,
        durationMinutes: 60,
      },
      {
        name: 'Geriatric Physiotherapy',
        description: 'Mobility and strength care for the elderly.',
        basePrice: 450,
        originalPrice: 600,
        discountPercent: 25,
        durationMinutes: 60,
      },
      {
        name: 'Pain Management',
        description: 'Evidence-based relief for chronic pain.',
        basePrice: 450,
        originalPrice: 600,
        discountPercent: 25,
        durationMinutes: 45,
      },
      {
        name: 'Joint & Back Pain',
        description: 'Targeted therapy for knees, hips and spine.',
        basePrice: 450,
        originalPrice: 600,
        discountPercent: 25,
        durationMinutes: 60,
      },
      {
        name: 'Sports Injury Rehab',
        description: 'Return-to-play plans for athletes.',
        basePrice: 450,
        originalPrice: 600,
        discountPercent: 25,
        durationMinutes: 60,
      },
      {
        name: 'Hand Therapy',
        description: 'Fine motor recovery and splinting.',
        basePrice: 450,
        originalPrice: 600,
        discountPercent: 25,
        durationMinutes: 45,
      },
      {
        name: 'Balance & Fall Prevention',
        description: 'Gait training and balance work.',
        basePrice: 450,
        originalPrice: 600,
        discountPercent: 25,
        durationMinutes: 50,
      },
    ];

    for (const srv of physioServices) {
      await Service.findOneAndUpdate(
        { categoryId: catMap['physiotherapy'], name: srv.name },
        {
          categoryId: catMap['physiotherapy'],
          name: srv.name,
          description: srv.description,
          basePrice: srv.basePrice,
          originalPrice: srv.originalPrice,
          discountPercent: srv.discountPercent,
          durationMinutes: srv.durationMinutes,
          serviceModesSupported: [ServiceMode.HOME_VISIT],
          engagementTypesSupported: [EngagementType.ONE_TIME, EngagementType.REGULAR_RECURRING],
          isActive: true,
        },
        { upsert: true, new: true }
      );
    }

    // Ensure ALL existing and custom Physiotherapy services in DB are strictly ₹450
    if (catMap['physiotherapy']) {
      await Service.updateMany(
        {
          $or: [
            { categoryId: catMap['physiotherapy'] },
            { name: /physio/i },
          ],
        },
        {
          $set: {
            basePrice: 450,
            originalPrice: 600,
            discountPercent: 25,
            serviceModesSupported: [ServiceMode.HOME_VISIT],
          },
        }
      );
    }

    // 2. Occupational Therapy Services (ALL set to ₹550 with 27% discount from ₹750)
    const otServices = [
      {
        name: 'Occupational Therapy',
        description: 'Regain independence in everyday activities.',
        basePrice: 550,
        originalPrice: 750,
        discountPercent: 27,
        durationMinutes: 60,
      },
      {
        name: 'Pediatric Occupational Therapy',
        description: "Therapy focused on children's developmental and everyday functional skills.",
        basePrice: 550,
        originalPrice: 750,
        discountPercent: 27,
        durationMinutes: 60,
      },
      {
        name: 'Hand & Fine Motor Therapy',
        description: 'Improve hand function, coordination and fine motor skills.',
        basePrice: 550,
        originalPrice: 750,
        discountPercent: 27,
        durationMinutes: 50,
      },
      {
        name: 'Activities of Daily Living Training',
        description: 'Support independence in dressing, eating, grooming and everyday activities.',
        basePrice: 550,
        originalPrice: 750,
        discountPercent: 27,
        durationMinutes: 60,
      },
      {
        name: 'Sensory Integration Therapy',
        description: 'Support sensory processing, regulation and functional participation.',
        basePrice: 550,
        originalPrice: 750,
        discountPercent: 27,
        durationMinutes: 60,
      },
      {
        name: 'Cognitive & Functional Rehabilitation',
        description: 'Improve cognitive and functional skills needed for everyday activities.',
        basePrice: 550,
        originalPrice: 750,
        discountPercent: 27,
        durationMinutes: 60,
      },
    ];

    for (const srv of otServices) {
      await Service.findOneAndUpdate(
        { categoryId: catMap['occupational-therapy'], name: srv.name },
        {
          categoryId: catMap['occupational-therapy'],
          name: srv.name,
          description: srv.description,
          basePrice: srv.basePrice,
          originalPrice: srv.originalPrice,
          discountPercent: srv.discountPercent,
          durationMinutes: srv.durationMinutes,
          serviceModesSupported: [ServiceMode.HOME_VISIT],
          engagementTypesSupported: [EngagementType.ONE_TIME, EngagementType.REGULAR_RECURRING],
          isActive: true,
        },
        { upsert: true, new: true }
      );
    }

    // Ensure ALL existing and custom Occupational Therapy services in DB are strictly ₹550
    if (catMap['occupational-therapy']) {
      await Service.updateMany(
        {
          $or: [
            { categoryId: catMap['occupational-therapy'] },
            { name: /occupational/i },
          ],
        },
        {
          $set: {
            basePrice: 550,
            originalPrice: 750,
            discountPercent: 27,
            serviceModesSupported: [ServiceMode.HOME_VISIT],
          },
        }
      );
    }

    // 3. Elder Care Services (All active services with 20% discount)
    const elderServices = [
      {
        name: 'Senior Companion & Caregiver',
        description: 'Assistance with daily living activities (bathing, dressing, meals, mobility, medication reminders).',
        basePrice: 1100,
        originalPrice: 1375,
        discountPercent: 20,
        durationMinutes: 240,
      },
      {
        name: 'Geriatric Nursing & Wound Care',
        description: 'Catheter care, bed sore treatment, IV drip management, and vital checks for elderly patients.',
        basePrice: 1400,
        originalPrice: 1750,
        discountPercent: 20,
        durationMinutes: 60,
      },
    ];

    for (const srv of elderServices) {
      await Service.findOneAndUpdate(
        { categoryId: catMap['elder-care'], name: srv.name },
        {
          categoryId: catMap['elder-care'],
          name: srv.name,
          description: srv.description,
          basePrice: srv.basePrice,
          originalPrice: srv.originalPrice,
          discountPercent: srv.discountPercent,
          durationMinutes: srv.durationMinutes,
          serviceModesSupported: [ServiceMode.HOME_VISIT],
          engagementTypesSupported: [EngagementType.ONE_TIME, EngagementType.REGULAR_RECURRING],
          isActive: true,
        },
        { upsert: true, new: true }
      );
    }

    // Ensure any other services missing discount are granted standard 20% savings without double discounting
    const unDiscountedServices = await Service.find({
      $or: [
        { originalPrice: { $exists: false } },
        { originalPrice: null },
        { discountPercent: { $exists: false } },
        { discountPercent: 0 },
      ],
    });
    for (const s of unDiscountedServices) {
      if (!s.originalPrice || s.originalPrice <= s.basePrice) {
        s.originalPrice = Math.round(s.basePrice / 0.8);
        s.discountPercent = 20;
        await s.save();
      }
    }

    // 4. Lab Test Services
    const targetLabCategoryId = canonicalLabId || catMap['lab-tests'] || catMap['lab-test'];

    const coreLabBundles = [
      {
        name: 'Full Body Health Checkup Panel',
        description: 'Complete blood count, lipid profile, liver function, kidney function, and blood sugar test.',
        basePrice: 1199,
        originalPrice: 1499,
        discountPercent: 20,
        testCategory: 'Comprehensive Panel',
        durationMinutes: 30,
      },
      {
        name: 'Thyroid & Diabetes Profile',
        description: 'TSH, T3, T4, HbA1c, Fasting Blood Sugar test.',
        basePrice: 639,
        originalPrice: 799,
        discountPercent: 20,
        testCategory: 'Profiles',
        durationMinutes: 30,
      },
      {
        name: 'Complete Blood Count (CBC)',
        description: 'Essential 24-parameter blood test profile',
        basePrice: 280,
        originalPrice: 350,
        discountPercent: 20,
        testCategory: 'Haematology',
        durationMinutes: 15,
      },
    ];

    for (const bundle of coreLabBundles) {
      await Service.findOneAndUpdate(
        { categoryId: targetLabCategoryId, name: bundle.name },
        {
          categoryId: targetLabCategoryId,
          name: bundle.name,
          description: bundle.description,
          basePrice: bundle.basePrice,
          originalPrice: bundle.originalPrice,
          discountPercent: bundle.discountPercent,
          testCategory: bundle.testCategory,
          durationMinutes: bundle.durationMinutes,
          serviceModesSupported: [ServiceMode.HOME_VISIT],
          engagementTypesSupported: [EngagementType.ONE_TIME],
          isActive: true,
        },
        { upsert: true, new: true }
      );
    }

    // Comprehensive catalog of 307 Lab Tests with 20% Discount
    const labTestOps = rawLabTestsCatalog.map((t) => {
      const discountedPrice = Math.round(t.originalPrice * 0.8);
      return {
        updateOne: {
          filter: { categoryId: targetLabCategoryId, name: t.name },
          update: {
            $set: {
              categoryId: targetLabCategoryId,
              name: t.name,
              description: `Diagnostic pathology lab test (${t.category}). MRP ₹${t.originalPrice} with 20% discount applied.`,
              basePrice: discountedPrice,
              originalPrice: t.originalPrice,
              discountPercent: 20,
              testCategory: t.category,
              durationMinutes: 15,
              serviceModesSupported: [ServiceMode.HOME_VISIT],
              engagementTypesSupported: [EngagementType.ONE_TIME],
              sampleCollectionInfo: 'Hygienic home sample collection or visit accredited laboratory center.',
              isActive: true,
            },
          },
          upsert: true,
        },
      };
    });

    if (labTestOps.length > 0) {
      await Service.bulkWrite(labTestOps);
    }

    // Associate all lab tests with verified labs
    const allLabTestDocIds = await Service.find({ categoryId: targetLabCategoryId, isActive: true }).distinct('_id');
    if (allLabTestDocIds.length > 0) {
      await LabProfile.updateMany({}, { $addToSet: { testsOffered: { $each: allLabTestDocIds } } });
    }

    // Deactivate legacy un-discounted duplicate lab tests
    await Service.updateMany(
      {
        categoryId: targetLabCategoryId,
        originalPrice: { $exists: false },
      },
      { $set: { isActive: false } }
    );

    // Deactivate legacy/unmapped services to prevent duplicate/stale options
    await Service.updateMany(
      {
        $or: [
          { categoryId: { $exists: false } },
          { categoryId: null },
          { name: 'Orthopedic Physiotherapy Session' },
          { name: 'Neuro Rehabilitation Session' },
          { name: 'Adult Functional Therapy' },
          { name: 'Geriatric Nursing & Daily Assistance' },
          { name: 'Comprehensive Lipid Profile' },
          { name: 'HbA1c Diabetes Profile Test' },
        ],
      },
      { $set: { isActive: false } }
    );

    console.log('[Seed] Categories & Sub-Services ensured and updated successfully.');
  } catch (error) {
    console.error('[Seed Error]:', error);
  }
};

// Get all active Categories
export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawCategories = await ServiceCategory.find({ isActive: true }).sort({ displayOrder: 1 });
    
    // Deduplicate categories by normalized slug/name
    const seen = new Set<string>();
    const categories = rawCategories.filter((cat) => {
      const key = (cat.slug || cat.name).toLowerCase().replace(/s$/, '').replace(/[^a-z0-9]/g, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return res.json({ success: true, categories });
  } catch (error) {
    next(error);
  }
};

// Get single Category by Slug or ID with its Sub-Services
export const getCategoryBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    let query: any = { slug, isActive: true };
    if (slug === 'lab-test' || slug === 'lab-tests') {
      query = { slug: { $in: ['lab-test', 'lab-tests'] }, isActive: true };
    }
    const category = await ServiceCategory.findOne(query);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Service category not found' });
    }

    const services = await Service.find({ categoryId: category._id, isActive: true });
    return res.json({ success: true, category, services });
  } catch (error) {
    next(error);
  }
};

// Get all active Sub-Services
export const getServices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { categoryId } = req.query;
    const filter: any = { isActive: true };
    if (categoryId) filter.categoryId = categoryId;

    const services = await Service.find(filter).populate('categoryId');
    return res.json({ success: true, services });
  } catch (error) {
    next(error);
  }
};

// Admin: Create Category
export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, iconName, displayOrder } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const existing = await ServiceCategory.findOne({ slug });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Category with this name already exists' });
    }

    const category = await ServiceCategory.create({
      name,
      slug,
      description,
      iconName: iconName || 'Activity',
      displayOrder: displayOrder || 0,
    });

    return res.status(201).json({ success: true, message: 'Category created', category });
  } catch (error) {
    next(error);
  }
};

// Admin: Create Sub-Service
export const createService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      categoryId,
      name,
      description,
      basePrice,
      originalPrice,
      discountPercent,
      durationMinutes,
      prepInstructions,
      sampleCollectionInfo,
    } = req.body;

    const finalBasePrice = Number(basePrice);
    const finalOrigPrice = originalPrice ? Number(originalPrice) : Math.round(finalBasePrice / 0.8);
    const finalDiscount = discountPercent !== undefined
      ? Number(discountPercent)
      : Math.round(((finalOrigPrice - finalBasePrice) / finalOrigPrice) * 100);

    const service = await Service.create({
      categoryId,
      name,
      description,
      basePrice: finalBasePrice,
      originalPrice: finalOrigPrice,
      discountPercent: finalDiscount,
      durationMinutes: durationMinutes || 45,
      serviceModesSupported: [ServiceMode.HOME_VISIT],
      engagementTypesSupported: [EngagementType.ONE_TIME, EngagementType.REGULAR_RECURRING],
      prepInstructions,
      sampleCollectionInfo,
    });

    return res.status(201).json({ success: true, message: 'Sub-service created successfully', service });
  } catch (error) {
    next(error);
  }
};

// Admin: Update Service Details & Pricing
export const updateService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      basePrice,
      originalPrice,
      discountPercent,
      durationMinutes,
      isActive,
    } = req.body;

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    if (name !== undefined) service.name = name;
    if (description !== undefined) service.description = description;
    if (basePrice !== undefined) service.basePrice = Number(basePrice);
    if (originalPrice !== undefined) service.originalPrice = Number(originalPrice);
    if (discountPercent !== undefined) {
      service.discountPercent = Number(discountPercent);
    } else if (service.originalPrice && service.originalPrice > service.basePrice) {
      service.discountPercent = Math.round(((service.originalPrice - service.basePrice) / service.originalPrice) * 100);
    }
    if (durationMinutes !== undefined) service.durationMinutes = Number(durationMinutes);
    if (isActive !== undefined) service.isActive = Boolean(isActive);

    // Enforce Home Visit only
    service.serviceModesSupported = [ServiceMode.HOME_VISIT];

    await service.save();

    return res.json({ success: true, message: 'Service updated successfully', service });
  } catch (error) {
    next(error);
  }
};

// Admin: Toggle Service Status
export const toggleServiceStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    service.isActive = !service.isActive;
    await service.save();

    return res.json({ success: true, message: `Service ${service.isActive ? 'activated' : 'disabled'}`, service });
  } catch (error) {
    next(error);
  }
};
