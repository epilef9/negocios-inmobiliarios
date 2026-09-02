const Property = require('../models/property.model');

class PropertyRepository {
    async getAllProperties() {
        return await Property.find();
    }

    async getPropertyById(id) {
        return await Property.findById(id);
    }

    async createProperty(propertyData) {
        const property = new Property(propertyData);
        return await property.save();
    }

    async updateProperty(id, propertyData) {
        return await Property.findByIdAndUpdate(id, propertyData, { new: true });
    }

    async deleteProperty(id) {
        return await Property.findByIdAndDelete(id);
    }

    async searchProperties(query) {
        return await Property.find(query);
    }
}

module.exports = new PropertyRepository();