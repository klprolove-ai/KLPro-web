export const SERVICE_HIERARCHY = {
  HelpingHand: {
    "Twenty Minutes": ["Laundry Ironing", "Packing & UnPacking", "Mopping & Dusting Wiping", "Meal preparing and serving", "Kitchen & Utensil Cleaning"],
    Schedule: ["Bathroom Cleaning", "Laundry Ironing", "Packing & UnPacking", "Mopping & Dusting Wiping", "Meal preparing and serving", "Kitchen & Utensil Cleaning"],
  },
  "Women's Salon & Spa": {
    "Salon for Women": ["Luxe", "Prime"],
    "Spa for Women": ["Ayurveda", "Prime", "Luxe"],
    "Hair Studio for Women": ["Blow-dry & style", "Cut & trim", "Hair care", "Keratin & botox", "Hair colour", "Hair extensions", "Fashion color"],
    "Makeup & Saree & Styling": ["Saree draping", "Wedding combos", "Party makeup", "Hair styling", "Add-ons"],
  },
  "Men's Salon & Massage": {
    "Salon for men": ["Royale", "Prime"],
    "Massage for Men": ["Prime", "Ayurveda", "Royale"],
  },
  "Cleaning & Pest Control": {
    Cleaning: ["Bathroom Cleaning", "Kitchen Cleaning", "Living & Bedroom Cleaning", "Full Home/Book by Room Cleaning"],
    "Pest Control": ["Cockroach Control", "Termite Control", "Bed Bugs Control", "Ant Control"],
  },
  "AC & Appliance Repair": {
    "Large appliances": ["AC Service & Repair", "Washing Machine", "Refrigerator", "Telivision"],
    "Other appliances": ["Chimney", "Microwave", "Stove", "Laptop", "Water Purifier Repair", "Geyser", "Air Cooler"],
  },
  "Electrician, Plumber, Carpenter & Mason": {
    Repairs: ["Electrician", "Plumber", "Carpenter"],
    "Installations & other services": ["Fan Installation", "Furniture Assembly", "Geyser", "IKEA Furniture Assembly", "Tile Grouting"],
    "Mason Services": ["Mistry & Labour"],
  },
  "Home Decoration": {
    Electrician: ["Festival Lights Installation"],
    Decorator: ["Home Decoration"],
  },
  "Property Services": {
    "For Rent": ["Houses and Apartments", "Offices and Shops"],
    "For Sale": ["Houses and Apartments", "Offices and Shops", "Lands & Plots", "New Project and New Property"],
    "STS": ["Short Term Stay"],
    "PG & Guest Houses": ["PG", "Guest House"],
  },
  "Snap Click": {
    "Photography": ["Photo Shoot"],
    "Videography": ["Video Shoot"],
    "Video-Mixing": ["Video Mixing (SD)", "HD Video Mixing", "4K Video Mixing", "Full HD Video Mixing", "Ultra HD Video Mixing", "8K Video Mixing"],
    "Album Design": ["Photo Album Design", "Album Cover Style"],
    "Designer": ["Album Designer"],
    "Camera on Rent": ["Still Camera (HD & Full HD) on Rent", "Video Camera (HD & Full HD) on Rent"],
    "Lights on Rent": ["Lights"],
    "Screen on Rent": ["Presentation Screen"],
    "Drone on Rent": ["Drone Camera on Rent"],
  },
};

const buildServiceTypeKey = (category, subCategory, subSubCategory) =>
  `${category}|||${subCategory}|||${subSubCategory}`;

export const SERVICE_TYPE_HIERARCHY = {
  [buildServiceTypeKey("Women's Salon & Spa", "Salon for Women", "Luxe")]: [
    "Waxing",
    "Bridal Facial",
    "Korean Facial",
    "Signature Facial",
    "Cleanup",
    "Pedicure & manicure",
    "Threading & face wax",
    "Bleach & detan & massage",
  ],
  [buildServiceTypeKey("Women's Salon & Spa", "Salon for Women", "Prime")]: [
    "Waxing & threading",
    "Korean Facial",
    "Signature Facial",
    "Cleanup",
    "Pedicure & manicure",
    "Hair& bleach & detan",
  ],
  [buildServiceTypeKey("Women's Salon & Spa", "Spa for Women", "Ayurveda")]: [
    "Stress relief",
    "Pain relief",
    "Ayurvedic skin care",
    "Add-ons",
  ],
  [buildServiceTypeKey("Women's Salon & Spa", "Spa for Women", "Prime")]: [
    "Stress relief",
    "Pain relief",
    "Skin care scrubs",
    "Post Natal",
    "Add-ons",
  ],
  [buildServiceTypeKey("Women's Salon & Spa", "Spa for Women", "Luxe")]: [
    "Pain relief",
    "Signature therapy",
    "Natural skincare",
    "Add-ons",
  ],
  [buildServiceTypeKey("Men's Salon & Massage", "Salon for men", "Royale")]: [
    "Pedicure",
    "Hair care",
    "Face care",
    "Shave/beard grooming",
    "Hair color",
    "Massage",
  ],
  [buildServiceTypeKey("Men's Salon & Massage", "Massage for Men", "Prime")]: [
    "Pain relief",
    "Stress relief",
    "Post workout",
    "Add-ons",
  ],
  [buildServiceTypeKey("Men's Salon & Massage", "Massage for Men", "Ayurveda")]: [
    "Stress relief",
    "Pain relief",
    "Add-ons",
  ],
  [buildServiceTypeKey("Men's Salon & Massage", "Massage for Men", "Royale")]: [
    "Pain relief",
    "Stress relief",
    "Sports therapy",
    "Signature therapy",
    "Add-ons",
  ],
  [buildServiceTypeKey("Cleaning & Pest Control", "Cleaning", "Bathroom Cleaning")]: [
    "One time deep clean",
    "Balcony cleaning",
    "Mini services",
  ],
  [buildServiceTypeKey("Cleaning & Pest Control", "Cleaning", "Kitchen Cleaning")]: [
    "Chimney cleaning",
    "Complete kitchen cleaning",
    "Appliance cleaning",
    "Cabinets & tiles",
    "Mini services",
  ],
  [buildServiceTypeKey("Cleaning & Pest Control", "Cleaning", "Living & Bedroom Cleaning")]: [
    "Sofa & carpet",
    "Living room care",
    "Bedroom care",
    "Mattress & bed",
    "Dining table & chairs",
    "Other furniture",
    "Windows & fan",
  ],
  [buildServiceTypeKey("Cleaning & Pest Control", "Cleaning", "Full Home/Book by Room Cleaning")]: [
    "Apartment",
    "Bungalow/duplex",
    "Book by room",
    "Mini services",
  ],
  [buildServiceTypeKey("Cleaning & Pest Control", "Pest Control", "Cockroach Control")]: [
    "Kitchen/Bathroom",
    "Apartment/Bunglow",
  ],
  [buildServiceTypeKey("Cleaning & Pest Control", "Pest Control", "Termite Control")]: [
    "Apartment termite control",
    "Bungalow termite control",
  ],
  [buildServiceTypeKey("Cleaning & Pest Control", "Pest Control", "Bed Bugs Control")]: ["Bed Bugs Control"],
  [buildServiceTypeKey("Cleaning & Pest Control", "Pest Control", "Ant Control")]: [
    "Apartment/Bunglow",
    "Kitchen/Bathroom",
  ],
  [buildServiceTypeKey("AC & Appliance Repair", "Large appliances", "AC Service & Repair")]: [
    "Service",
    "Repair & gas refill",
    "Installation/uninstallation",
  ],
  [buildServiceTypeKey("AC & Appliance Repair", "Large appliances", "Washing Machine")]: [
    "Servicing",
    "Repair",
    "Installation & uninstallation",
  ],
  [buildServiceTypeKey("AC & Appliance Repair", "Large appliances", "Refrigerator")]: ["Refrigerator check-up"],
  [buildServiceTypeKey("AC & Appliance Repair", "Large appliances", "Telivision")]: [
    "TV check-up",
    "TV Installation",
    "TV Uninstallation",
  ],
  [buildServiceTypeKey("AC & Appliance Repair", "Other appliances", "Chimney")]: [
    "Repair",
    "Service",
    "Installation/uninstallation",
  ],
  [buildServiceTypeKey("AC & Appliance Repair", "Other appliances", "Microwave")]: ["Microwave check-up"],
  [buildServiceTypeKey("AC & Appliance Repair", "Other appliances", "Stove")]: ["Service", "Repair"],
  [buildServiceTypeKey("AC & Appliance Repair", "Other appliances", "Laptop")]: [
    "Laptop/Desktop service",
    "System upgrade consultation",
    "Component Installation",
    "Laptop check-up",
  ],
  [buildServiceTypeKey("AC & Appliance Repair", "Other appliances", "Water Purifier Repair")]: ["Water Purifier Repair"],
  [buildServiceTypeKey("AC & Appliance Repair", "Other appliances", "Geyser")]: [
    "Repair & service",
    "Installation & uninstallation",
  ],
  [buildServiceTypeKey("AC & Appliance Repair", "Other appliances", "Air Cooler")]: ["Repair & service"],
  [buildServiceTypeKey("Electrician, Plumber, Carpenter & Mason", "Repairs", "Electrician")]: [
    "Switch & socket",
    "Fan",
    "Light",
    "Wiring",
    "Doorbell & security",
    "MCB/fuse",
    "Appliances",
    "Book a consultation",
  ],
  [buildServiceTypeKey("Electrician, Plumber, Carpenter & Mason", "Repairs", "Plumber")]: [
    "Tap & mixe,r",
    "Toilet",
    "Bath & shower",
    "Bath accessories",
    "Basin & sink",
    "Drainage & blockage",
    "Leakage & connections",
    "Water tank & motor",
    "Book a consultation",
  ],
  [buildServiceTypeKey("Electrician, Plumber, Carpenter & Mason", "Repairs", "Carpenter")]: [
    "Wooden door",
    "Cupboard & drawer",
    "Decor & mirror",
    "Shelf & cabinet",
    "Lock & Hinge",
    "Curtain & window",
    "Funiture repair",
    "Funiture assembly",
    "Kitchen fittings",
    "Bath fittings & mirrors",
    "Balcony fittings",
    "At home consultation",
  ],
  [buildServiceTypeKey("Electrician, Plumber, Carpenter & Mason", "Installations & other services", "Fan Installation")]: [
    "Installation/replacement",
    "Uninstallation",
  ],
  [buildServiceTypeKey("Electrician, Plumber, Carpenter & Mason", "Installations & other services", "Furniture Assembly")]: [
    "Wooden bed",
    "Wardrobe",
    "Dining & kitchen",
    "Tables & chairs",
    "Children",
    "Living & TV",
    "Outdoor",
    "Religious",
    "Cabinet/shelving unit",
  ],
  [buildServiceTypeKey("Electrician, Plumber, Carpenter & Mason", "Installations & other services", "Geyser")]: [
    "Repair & service",
    "Installation & uninstallation",
  ],
  [buildServiceTypeKey("Electrician, Plumber, Carpenter & Mason", "Installations & other services", "IKEA Furniture Assembly")]: [
    "Wardrobes",
    "Tables & drawers",
    "Children Beds & dining",
    "Seating",
    "Outdoor",
    "Storage",
    "Furnishing",
    "Bathroom",
    "Washbasin cabinets",
    "TV furniture",
    "Kitchen",
  ],
  [buildServiceTypeKey("Electrician, Plumber, Carpenter & Mason", "Installations & other services", "Tile Grouting")]: [
    "Waterproofing",
    "Indoor grouting",
    "Outdoor grouting",
  ],
  [buildServiceTypeKey("Electrician, Plumber, Carpenter & Mason", "Mason Services", "Mistry & Labour")]: [
    "Wall repair",
    "Malba Cleaning Support",
    "Support in Building Construction",
    "Bricks Loading & Unloading",
  ],
  [buildServiceTypeKey("Home Decoration", "Electrician", "Festival Lights Installation")]: [
    "Light unistallations",
    "Balcony lights",
    "Railing lights",
    "Room lights",
    "Mandir lights",
    "Outdoor lights",
    "Garden lights",
    "Xmas light decor",
    "Custom services",
  ],
  [buildServiceTypeKey("Home Decoration", "Decorator", "Home Decoration")]: [
    "Birthday Decoration",
    "Welcome Baby Decoration",
    "Welcome Bride Decoration",
    "Anniversary Decoration",
    "Retirement Decoration",
  ],
  // Property Services
  [buildServiceTypeKey("Property Services", "For Rent", "Houses and Apartments")]: [
    "House Rent",
    "Apartment Rent",
    "Bunglow Rent",
  ],
  [buildServiceTypeKey("Property Services", "For Rent", "Offices and Shops")]: [
    "Commercial Office",
    "Commercial Shops",
  ],
  [buildServiceTypeKey("Property Services", "For Sale", "Houses and Apartments")]: [
    "Individual House Sale",
    "Apartment Sale",
    "Bunglow Sale",
    "Flat Sale",
    "Builder Floor Sale",
  ],
  [buildServiceTypeKey("Property Services", "For Sale", "Offices and Shops")]: [
    "Commercial Shops Sale",
    "Commercial Office Sale",
  ],
  [buildServiceTypeKey("Property Services", "For Sale", "Lands & Plots")]: [
    "Residential Plot Sale",
    "Commercial Plot Sale",
  ],
  [buildServiceTypeKey("Property Services", "For Sale", "New Project and New Property")]: [
    "Commercial Property Sale",
    "Residential Property Sale",
    "Commercial Project Sale",
    "Residential Project Sale",
    "Builder Project Sale",
  ],
  [buildServiceTypeKey("Property Services", "STS", "Short Term Stay")]: [
    "Single Room",
    "Double Room",
    "Deluxe Room",
    "Royal Room",
    "Prime Room",
  ],
  [buildServiceTypeKey("Property Services", "PG & Guest Houses", "PG")]: [
    "Girls PG",
    "Boys PG",
  ],
  [buildServiceTypeKey("Property Services", "PG & Guest Houses", "Guest House")]: [
    "Family Guest House",
    "Individual Guest House",
    "Corporate Guest House",
    "Farm House",
  ],
  // Snap Click - Photography
  [buildServiceTypeKey("Snap Click", "Photography", "Photo Shoot")]: [
    "Baby & Kids Shoot",
    "Pet Shoot",
    "Drone & Aerial",
    "Maternety Shoot",
    "Portrait Portfolio Shoot",
    "Head Shots",
    "Festivals Shoot",
    "Family & Siblings Shoot",
    "Travel Photography",
    "Bride/Groom-To-Be Shoot",
    "BTS(Behind the Scenes) Shoot",
    "Interior Shoot",
    "Couple Things Shoot",
    "Friends Shoot",
    "Matrimonial Shoot",
    "Cinematographer",
  ],
  // Snap Click - Videography
  [buildServiceTypeKey("Snap Click", "Videography", "Video Shoot")]: [
    "Event Shoot",
    "Sports/Fitness Shoot",
    "Podcast/DJSet/PR",
    "Pre-Wedding Shoot",
    "Wedding Shoot",
    "Engagement Shoot",
    "Corporate/Industrial Shoot",
    "Mobi-Reel & Mobi-Click",
    "Gift A Videoshoot Product Shoot",
    "Personal Videographer",
    "Baby & Kids Shoot",
    "Pet Shoot",
    "Drone & Aerial",
    "Maternety Shoot",
    "Portrait Portfolio Shoot",
    "Head Shots",
    "Festivals Shoot",
    "Family & Siblings Shoot",
    "Travel Photography",
    "Bride/Groom-To-Be Shoot",
    "BTS(Behind the Scenes) Shoot",
    "Interior Shoot",
    "Couple Things Shoot",
    "Friends Shoot",
    "Matrimonial Shoot",
    "Cinematographer",
  ],
  // Snap Click - Video-Mixing
  [buildServiceTypeKey("Snap Click", "Video-Mixing", "Video Mixing (SD)")]: [
    "Teaser",
    "Highlights",
    "Mini Video",
    "Title",
    "Full Wedding",
  ],
  [buildServiceTypeKey("Snap Click", "Video-Mixing", "HD Video Mixing")]: [
    "Teaser",
    "Highlights",
    "Mini Video",
    "Title",
    "Full Wedding",
  ],
  [buildServiceTypeKey("Snap Click", "Video-Mixing", "4K Video Mixing")]: [
    "Teaser",
    "Highlights",
    "Mini Video",
    "Title",
    "Full Wedding",
  ],
  [buildServiceTypeKey("Snap Click", "Video-Mixing", "Full HD Video Mixing")]: [
    "Teaser",
    "Highlights",
    "Mini Video",
    "Title",
    "Full Wedding",
  ],
  [buildServiceTypeKey("Snap Click", "Video-Mixing", "Ultra HD Video Mixing")]: [
    "Teaser",
    "Highlights",
    "Mini Video",
    "Title",
    "Full Wedding",
  ],
  [buildServiceTypeKey("Snap Click", "Video-Mixing", "8K Video Mixing")]: [
    "Teaser",
    "Highlights",
    "Mini Video",
    "Title",
    "Full Wedding",
  ],
  // Snap Click - Album Design
  [buildServiceTypeKey("Snap Click", "Album Design", "Photo Album Design")]: [
    "Karishma",
    "Canvera",
    "Monarch",
    "Koyal-BC Color",
  ],
  [buildServiceTypeKey("Snap Click", "Album Design", "Album Cover Style")]: [
    "Karishma",
    "Canvera",
    "Monarch",
    "Koyal-BC Color",
  ],
  // Snap Click - Designer
  [buildServiceTypeKey("Snap Click", "Designer", "Album Designer")]: [
    "Photo Designer",
    "Album Designer",
    "Banner Designer",
    "Pamphlet Designer",
  ],
  // Snap Click - Camera on Rent
  [buildServiceTypeKey("Snap Click", "Camera on Rent", "Still Camera (HD & Full HD) on Rent")]: [
    "Sony",
    "Kodak",
    "Nikkon",
    "Cannon",
    "Polaride",
    "Panasonic",
  ],
  [buildServiceTypeKey("Snap Click", "Camera on Rent", "Video Camera (HD & Full HD) on Rent")]: [
    "Sony",
    "Kodak",
    "Nikkon",
    "Cannon",
    "Polaride",
    "Panasonic",
  ],
  // Snap Click - Lights on Rent
  [buildServiceTypeKey("Snap Click", "Lights on Rent", "Lights")]: [
    "Main Light",
    "Video Light",
    "RGB Light",
    "Modifer",
    "Diffusion",
  ],
  // Snap Click - Screen on Rent
  [buildServiceTypeKey("Snap Click", "Screen on Rent", "Presentation Screen")]: [
    "LED Video Wall",
    "Magic Mirror",
    "Projector",
    "LCD Panels",
  ],
  // Snap Click - Drone on Rent
  [buildServiceTypeKey("Snap Click", "Drone on Rent", "Drone Camera on Rent")]: [
    "Nano Drone",
    "Micro Drone",
    "Small Drone",
    "Medium Drone",
    "FPV Drone",
  ],
};

export function getServiceTypeOptions(category, subCategory, subSubCategory) {
  if (!category || !subCategory || !subSubCategory || subCategory === 'all' || subSubCategory === 'all') {
    return [];
  }

  return SERVICE_TYPE_HIERARCHY[buildServiceTypeKey(category, subCategory, subSubCategory)] || [];
}

export function getHierarchyOptions(category, subCategory, subSubCategory) {
  const normalizeToArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    return String(value).split(',').map((item) => item.trim()).filter(Boolean);
  };

  const categoryList = normalizeToArray(category);
  const subCategoryList = normalizeToArray(subCategory);
  const subSubCategoryList = normalizeToArray(subSubCategory);

  if (!categoryList.length) {
    return {
      subCategories: [],
      subSubCategories: [],
      serviceTypes: [],
    };
  }

  const subCategories = Array.from(
    new Set(
      categoryList.flatMap((categoryKey) => Object.keys(SERVICE_HIERARCHY[categoryKey] || {}))
    )
  );

  if (!subCategoryList.length) {
    return {
      subCategories,
      subSubCategories: [],
      serviceTypes: [],
    };
  }

  const subSubCategories = Array.from(
    new Set(
      categoryList.flatMap((categoryKey) =>
        subCategoryList.flatMap((subCategoryKey) => SERVICE_HIERARCHY[categoryKey]?.[subCategoryKey] || [])
      )
    )
  );

  if (!subSubCategoryList.length) {
    return {
      subCategories,
      subSubCategories,
      serviceTypes: [],
    };
  }

  const serviceTypes = Array.from(
    new Set(
      categoryList.flatMap((categoryKey) =>
        subCategoryList.flatMap((subCategoryKey) =>
          subSubCategoryList.flatMap((subSubCategoryKey) =>
            getServiceTypeOptions(categoryKey, subCategoryKey, subSubCategoryKey)
          )
        )
      )
    )
  );

  return {
    subCategories,
    subSubCategories,
    serviceTypes,
  };
}
