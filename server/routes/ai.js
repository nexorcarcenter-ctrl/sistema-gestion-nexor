const router = require("express").Router();
const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Interpret free text into service order fields
router.post("/interpret-schedule", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "text requerido" });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: "OPENAI_API_KEY no configurada" });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Sos un asistente de un taller mecánico/electrónico de autos en Uruguay.
Tu tarea es extraer información de un mensaje de texto libre para agendar una orden de servicio.
El año actual es ${new Date().getFullYear()}.
Extraé todos los datos que puedas. Si no podés determinar un dato, dejalo como string vacío "".
Para la fecha: interpretá expresiones como "15 de marzo" como ${new Date().getFullYear()}-03-15, "mañana", "el lunes", etc. Formato: YYYY-MM-DD.
Para la hora: "09hs", "9 de la mañana", "14:30" → formato HH:MM (24hs).
Para servicios: el nombre del trabajo principal (ej: "Colocación de radio").
Para notas: los productos, materiales o detalles adicionales (ej: "Quantum 9 pulgadas, Marco adaptador 5").
Respondé SOLO con un JSON con estas claves: entry_date, appointment_time, customer_name, customer_phone, car_brand, car_model, car_plate, car_year, service_name, notes.`,
        },
        { role: "user", content: text },
      ],
    });

    const data = JSON.parse(completion.choices[0].message.content);
    res.json(data);
  } catch (err) {
    console.error("AI interpret-schedule error:", err.message);
    res.status(500).json({ error: "Error al interpretar con IA" });
  }
});

// Detect category and vehicle from product name
router.post("/detect-product", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name requerido" });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: "OPENAI_API_KEY no configurada" });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Sos un asistente de un taller mecánico/electrónico de autos en Uruguay.
Dado el nombre de un producto, detectá su categoría y si aplica a un vehículo específico.
Categorías posibles: Radios, Parlantes, Amplificadores, Subwoofers, Cámaras, Alarmas, Luces, Aceites, Filtros, Frenos, Suspensión, Electricidad, Herramientas, Accesorios, Otros.
Si el producto es para una marca/modelo específico de auto, indicalo. Si es genérico, dejá car_brand, car_model y car_year vacíos.
Respondé SOLO con un JSON con estas claves: category, car_brand, car_model, car_year (número o "").`,
        },
        { role: "user", content: name },
      ],
    });

    const data = JSON.parse(completion.choices[0].message.content);
    res.json(data);
  } catch (err) {
    console.error("AI detect-product error:", err.message);
    res.status(500).json({ error: "Error al detectar con IA" });
  }
});

module.exports = router;
