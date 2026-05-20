const HomepageCard = require('../models/HomepageCard');
const cloudinary = require('../config/cloudinary');

const uploadBufferToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

const mapCardsBySection = (cards) => {
  const sections = {
    'explore-popular-categories': [],
    'salon-for-women': [],
    'cleaning-essentials': [],
    'grooming-for-men': [],
    'home-decoration': [],
    'property-services': [],
    'snap-click': [],
  };

  cards.forEach((card) => {
    if (sections[card.section]) {
      sections[card.section].push(card);
    }
  });

  return sections;
};

const getHomepageCardsPublic = async (req, res) => {
  try {
    const cards = await HomepageCard.find({ isActive: true }).sort({ section: 1, order: 1, createdAt: 1 });
    res.status(200).json({ success: true, sections: mapCardsBySection(cards) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch homepage cards', error: error.message });
  }
};

const getHomepageCardsAdmin = async (req, res) => {
  try {
    const cards = await HomepageCard.find().sort({ section: 1, order: 1, createdAt: 1 });
    res.status(200).json({ success: true, cards });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch homepage cards', error: error.message });
  }
};

const createHomepageCard = async (req, res) => {
  try {
    const { section, title, subtitle, image, time, order, isActive } = req.body;
    if (!section || !title) {
      return res.status(400).json({ success: false, message: 'Section and title are required' });
    }

    let imageUrl = image || '';
    if (req.file) {
      const uploadResult = await uploadBufferToCloudinary(req.file.buffer, 'homepage_cards');
      imageUrl = uploadResult.secure_url || uploadResult.url || imageUrl;
    }

    const card = await HomepageCard.create({
      section,
      title,
      subtitle: subtitle || '',
      image: imageUrl,
      time: time || '',
      order: Number(order) || 0,
      isActive: isActive === undefined ? true : String(isActive) !== 'false',
    });

    res.status(201).json({ success: true, message: 'Homepage card created', card });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create homepage card', error: error.message });
  }
};

const updateHomepageCard = async (req, res) => {
  try {
    const { id } = req.params;
    const { section, title, subtitle, image, time, order, isActive } = req.body;

    const existingCard = await HomepageCard.findById(id);
    if (!existingCard) {
      return res.status(404).json({ success: false, message: 'Homepage card not found' });
    }

    let imageUrl = existingCard.image || '';
    if (req.file) {
      const uploadResult = await uploadBufferToCloudinary(req.file.buffer, 'homepage_cards');
      imageUrl = uploadResult.secure_url || uploadResult.url || imageUrl;
    } else if (image !== undefined) {
      imageUrl = image;
    }

    const updated = await HomepageCard.findByIdAndUpdate(
      id,
      {
        section,
        title,
        subtitle: subtitle || '',
        image: imageUrl,
        time: time || '',
        order: Number(order) || 0,
        isActive: isActive === undefined ? true : String(isActive) !== 'false',
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, message: 'Homepage card updated', card: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update homepage card', error: error.message });
  }
};

const deleteHomepageCard = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await HomepageCard.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Homepage card not found' });
    }
    res.status(200).json({ success: true, message: 'Homepage card deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete homepage card', error: error.message });
  }
};

module.exports = {
  getHomepageCardsPublic,
  getHomepageCardsAdmin,
  createHomepageCard,
  updateHomepageCard,
  deleteHomepageCard,
};
