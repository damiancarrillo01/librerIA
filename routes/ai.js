const express = require('express');
const router = express.Router();
const AIService = require('../services/aiService');

// Ruta para recomendaciones personalizadas con IA (solo Firebase)
router.post('/recomendar', async (req, res) => {
    try {
        const { lista, calidad } = req.body;
        if (!Array.isArray(lista) || lista.length === 0) {
            return res.status(400).json({ error: 'Lista vacía o formato incorrecto.' });
        }
        // Procesar cada ítem con la IA
        const recomendaciones = await Promise.all(
            lista.map(async (item) => {
                // Separar cantidad y nombre si es posible
                const match = item.match(/^(\d+)\s+(.*)$/);
                let cantidad = 1;
                let nombre = item;
                if (match) {
                    cantidad = parseInt(match[1], 10);
                    nombre = match[2];
                }
                const sugerencia = await AIService.simulateAiSuggestions(nombre, cantidad, calidad);
                return {
                    item: nombre,
                    cantidad,
                    sugerencia
                };
            })
        );
        res.json({ recomendaciones });
    } catch (error) {
        console.error('Error en recomendaciones IA:', error);
        res.status(500).json({ error: 'Error procesando recomendaciones con IA' });
    }
});

module.exports = router;