// properties.controller.js

const PropertyService = require('../services/properties.service');

const extractCoordinates = (value) => {
    const coordinateMatch = value.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
        || value.match(/[?&](?:q|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
        || value.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
        || value.match(/\/search\/(-?\d+(?:\.\d+)?),\+?(-?\d+(?:\.\d+)?)/);
    return coordinateMatch ? { latitud: coordinateMatch[1], longitud: coordinateMatch[2] } : null;
};

exports.resolveMapsLink = async (req, res) => {
    const rawUrl = String(req.query.url ?? '');
    try {
        const parsedUrl = new URL(rawUrl);
        const allowedHosts = ['maps.app.goo.gl', 'goo.gl', 'google.com', 'www.google.com', 'maps.google.com'];
        if (!allowedHosts.some((host) => parsedUrl.hostname === host || parsedUrl.hostname.endsWith(`.${host}`))) {
            return res.status(400).json({ message: 'El enlace no pertenece a Google Maps' });
        }

        const esDeGoogle = (direccion) => {
            const destino = new URL(direccion);
            const host = destino.hostname;
            return destino.protocol === 'https:' && allowedHosts.some((permitido) => host === permitido || host.endsWith(`.${permitido}`));
        };
        if (parsedUrl.protocol !== 'https:') {
            return res.status(400).json({ message: 'El enlace de Google Maps tiene que empezar con https://' });
        }

        // Se siguen las redirecciones a mano, de a una, y solo mientras sigan dentro de Google:
        // así el servidor nunca termina pidiendo una dirección interna o de otro sitio
        let currentUrl = parsedUrl.toString();
        for (let redirectCount = 0; redirectCount < 5; redirectCount += 1) {
            const coordinates = extractCoordinates(currentUrl);
            if (coordinates) return res.status(200).json({ data: coordinates });

            const response = await fetch(currentUrl, { redirect: 'manual', signal: AbortSignal.timeout(8000) });
            const siguiente = response.headers.get('location');
            if (response.status >= 300 && response.status < 400 && siguiente) {
                const destino = new URL(siguiente, currentUrl).toString();
                if (!esDeGoogle(destino)) break;
                currentUrl = destino;
                continue;
            }

            // Se lee como mucho 1 MB de la página
            const html = (await response.text()).slice(0, 1024 * 1024);
            const bodyCoordinates = extractCoordinates(html);
            if (bodyCoordinates) return res.status(200).json({ data: bodyCoordinates });
            break;
        }

        return res.status(404).json({ message: 'No se encontraron coordenadas en el enlace' });
    } catch (_error) {
        return res.status(400).json({ message: 'El enlace de Google Maps no es válido' });
    }
};

// Obtener todas las propiedades
exports.getAllProperties = async (req, res) => {
    try {
        const properties = await PropertyService.getAllProperties(req.query);
        res.status(200).json({ data: properties });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener propiedades' });
    }
};

// Obtener una propiedad específica
exports.getPropertyById = async (req, res) => {
    const { id } = req.params;
    try {
        const property = await PropertyService.getPropertyById(id);
        if (!property) {
            return res.status(404).json({ message: 'Propiedad no encontrada' });
        }
        res.status(200).json({ data: property });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener la propiedad' });
    }
};

// Crear una nueva propiedad
exports.createProperty = async (req, res) => {
    const propertyData = req.body;
    try {
        const newProperty = await PropertyService.createProperty(propertyData);
        res.status(201).json({ data: newProperty });
    } catch (error) {
        res.status(400).json({ message: 'No se pudo crear la propiedad', error: error.message });
    }
};

// Actualizar una propiedad existente
exports.updateProperty = async (req, res) => {
    const { id } = req.params;
    const propertyData = req.body;
    try {
        const updatedProperty = await PropertyService.updateProperty(id, propertyData);
        if (!updatedProperty) {
            return res.status(404).json({ message: 'Propiedad no encontrada' });
        }
        res.status(200).json({ data: updatedProperty });
    } catch (error) {
        res.status(400).json({ message: 'No se pudo actualizar la propiedad', error: error.message });
    }
};

// Eliminar una propiedad
exports.deleteProperty = async (req, res) => {
    const { id } = req.params;
    try {
        const deletedProperty = await PropertyService.deleteProperty(id);
        if (!deletedProperty) {
            return res.status(404).json({ message: 'Propiedad no encontrada' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar la propiedad' });
    }
};

// Reordenar catálogo de propiedades (solo administrador)
exports.reorderProperties = async (req, res) => {
    try {
        const { items } = req.body;
        if (!Array.isArray(items)) {
            return res.status(400).json({ message: 'El campo items debe ser una lista de propiedades con su orden' });
        }
        await PropertyService.reorderProperties(items);
        res.status(200).json({ success: true, message: 'Orden de propiedades actualizado exitosamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar el orden de las propiedades', error: error.message });
    }
};