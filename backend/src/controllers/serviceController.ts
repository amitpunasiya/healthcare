import { Request, Response, NextFunction } from 'express';
import ServiceCategory from '../models/ServiceCategory';
import Service from '../models/Service';
import { ServiceMode, EngagementType } from '../constants/enums';

// Auto-seed default categories if database is empty
export const seedDefaultServices = async () => {
  try {
    const count = await ServiceCategory.countDocuments();
    if (count > 0) return;

    console.log('[Seed] Seeding initial Healthcare Service Categories & Sub-Services...');

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
        name: 'Lab Tests',
        slug: 'lab-tests',
        description: 'Comprehensive diagnostic blood panels, pathology testing, and home sample collection.',
        iconName: 'FlaskConical',
        displayOrder: 4,
      },
    ];

    const createdCategories = await ServiceCategory.insertMany(defaultCategories);
    const catMap: { [key: string]: any } = {};
    createdCategories.forEach((c) => {
      catMap[c.slug] = c._id;
    });

    const defaultSubServices = [
      // Physiotherapy
      {
        categoryId: catMap['physiotherapy'],
        name: 'Orthopedic & Joint Physiotherapy',
        description: 'Post-fracture rehabilitation, arthritis management, joint pain relief, and back pain therapy.',
        basePrice: 800,
        durationMinutes: 60,
        serviceModesSupported: [ServiceMode.HOME_VISIT, ServiceMode.CLINIC_VISIT],
        engagementTypesSupported: [EngagementType.ONE_TIME, EngagementType.REGULAR_RECURRING],
      },
      {
        categoryId: catMap['physiotherapy'],
        name: 'Neurological Rehabilitation',
        description: 'Therapy for stroke recovery, Parkinson’s disease management, and nerve injury rehabilitation.',
        basePrice: 1000,
        durationMinutes: 60,
        serviceModesSupported: [ServiceMode.HOME_VISIT, ServiceMode.CLINIC_VISIT],
        engagementTypesSupported: [EngagementType.ONE_TIME, EngagementType.REGULAR_RECURRING],
      },
      {
        categoryId: catMap['physiotherapy'],
        name: 'Chest & Cardiac Physiotherapy',
        description: 'Clearance of airway secretions, breathing exercises, and post-cardiac surgery lung rehab.',
        basePrice: 900,
        durationMinutes: 45,
        serviceModesSupported: [ServiceMode.HOME_VISIT, ServiceMode.CLINIC_VISIT],
        engagementTypesSupported: [EngagementType.ONE_TIME, EngagementType.REGULAR_RECURRING],
      },

      // Occupational Therapy
      {
        categoryId: catMap['occupational-therapy'],
        name: 'Fine Motor & Hand Therapy',
        description: 'Hand injury rehab, splinting assessment, finger dexterity training, and occupational ergonomics.',
        basePrice: 850,
        durationMinutes: 50,
        serviceModesSupported: [ServiceMode.HOME_VISIT, ServiceMode.CLINIC_VISIT],
        engagementTypesSupported: [EngagementType.ONE_TIME, EngagementType.REGULAR_RECURRING],
      },
      {
        categoryId: catMap['occupational-therapy'],
        name: 'Adult Motor Rehabilitation',
        description: 'Sensory integration therapy, stroke recovery support, fine motor control, and functional milestone training.',
 basePrice: 950,
        durationMinutes: 60,
        serviceModesSupported: [ServiceMode.HOME_VISIT, ServiceMode.CLINIC_VISIT],
        engagementTypesSupported: [EngagementType.ONE_TIME, EngagementType.REGULAR_RECURRING],
      },

      // Elder Care
      {
        categoryId: catMap['elder-care'],
        name: 'Senior Companion & Caregiver',
        description: 'Assistance with daily living activities (bathing, dressing, meals, mobility, medication reminders).',
        basePrice: 1100,
        durationMinutes: 240,
        serviceModesSupported: [ServiceMode.HOME_VISIT],
        engagementTypesSupported: [EngagementType.ONE_TIME, EngagementType.REGULAR_RECURRING],
      },
      {
        categoryId: catMap['elder-care'],
        name: 'Geriatric Nursing & Wound Care',
        description: 'Catheter care, bed sore treatment, IV drip management, and vital checks for elderly patients.',
        basePrice: 1400,
        durationMinutes: 60,
        serviceModesSupported: [ServiceMode.HOME_VISIT],
        engagementTypesSupported: [EngagementType.ONE_TIME, EngagementType.REGULAR_RECURRING],
      },

      // Lab Tests
      {
        categoryId: catMap['lab-tests'],
        name: 'Full Body Health Checkup Panel',
        description: 'Complete blood count, lipid profile, liver function, kidney function, and blood sugar test.',
        basePrice: 1499,
        durationMinutes: 30,
        serviceModesSupported: [ServiceMode.HOME_VISIT, ServiceMode.LAB_VISIT],
        engagementTypesSupported: [EngagementType.ONE_TIME],
        prepInstructions: 'Fast for 10-12 hours prior to sample collection. Drink water only.',
        sampleCollectionInfo: '5 ml venous blood sample collected by certified phlebotomist.',
      },
      {
        categoryId: catMap['lab-tests'],
        name: 'Thyroid & Diabetes Profile',
        description: 'TSH, T3, T4, HbA1c, Fasting Blood Sugar test.',
        basePrice: 799,
        durationMinutes: 30,
        serviceModesSupported: [ServiceMode.HOME_VISIT, ServiceMode.LAB_VISIT],
        engagementTypesSupported: [EngagementType.ONE_TIME],
        prepInstructions: 'Fasting of 8 hours required.',
        sampleCollectionInfo: 'Blood sample.',
      },
    ];

    await Service.insertMany(defaultSubServices);
    console.log('[Seed] Default Categories & Sub-Services seeded successfully.');
  } catch (error) {
    console.error('[Seed Error]:', error);
  }
};

// Get all active Categories
export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await ServiceCategory.find({ isActive: true }).sort({ displayOrder: 1 });
    return res.json({ success: true, categories });
  } catch (error) {
    next(error);
  }
};

// Get single Category by Slug or ID with its Sub-Services
export const getCategoryBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const category = await ServiceCategory.findOne({ slug, isActive: true });
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
      durationMinutes,
      serviceModesSupported,
      engagementTypesSupported,
      prepInstructions,
      sampleCollectionInfo,
    } = req.body;

    const service = await Service.create({
      categoryId,
      name,
      description,
      basePrice,
      durationMinutes: durationMinutes || 45,
      serviceModesSupported: serviceModesSupported || [ServiceMode.HOME_VISIT, ServiceMode.CLINIC_VISIT],
      engagementTypesSupported: engagementTypesSupported || [EngagementType.ONE_TIME, EngagementType.REGULAR_RECURRING],
      prepInstructions,
      sampleCollectionInfo,
    });

    return res.status(201).json({ success: true, message: 'Sub-service created successfully', service });
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
