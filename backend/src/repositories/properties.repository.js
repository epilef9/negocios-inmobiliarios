const Property = require('../models/property.model');

class PropertyRepository {
    async getAllProperties(filters = {}) {
        return Property.find(filters).sort({ orden: 1, createdAt: -1 });
    }

    async reorderProperties(items) {
        if (!Array.isArray(items) || items.length === 0) return [];
        const operations = items.map((item) => ({
            updateOne: {
                filter: { _id: item.id },
                update: { $set: { orden: Number(item.orden) || 0 } },
            },
        }));
        return Property.bulkWrite(operations);
    }

    async getPropertyById(id) {
        return Property.findById(id);
    }

    async createProperty(propertyData) {
        return Property.create(propertyData);
    }

    async updateProperty(id, propertyData) {
        return Property.findByIdAndUpdate(id, propertyData, {
            new: true,
            runValidators: true,
        });
    }

    async deleteProperty(id) {
        return Property.findByIdAndDelete(id);
    }

    async searchProperties(query) {
        return await Property.find(query);
    }
}

module.exports = new PropertyRepository();