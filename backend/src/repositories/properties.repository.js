const Property = require('../models/property.model');

class PropertyRepository {
    async getAllProperties(filters = {}) {
        return Property.find(filters).sort({ createdAt: -1 });
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