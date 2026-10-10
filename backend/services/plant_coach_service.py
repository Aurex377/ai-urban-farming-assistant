"""
GrowWise AI — Plant Coach & Knowledge Transfer Service
------------------------------------------------------
Provides conversational AI mentoring and structured botanical knowledge transfer
grounded in the plant's 10-dimension agronomic context:
- Plant Species, Age & Phenological Stage
- Edaphic Conditions & Container Dynamics
- Ambient Weather & Evapotranspiration
- AI Pathology Findings & Clinical Severity
- Deterministic Irrigation Metrics
- Verified Botanical Treatment Protocols
"""

import os
import re
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import httpx
from supabase import Client

try:
    from backend.services.context_aggregator import aggregate_plant_context
    from backend.services.nvidia_nemotron_service import get_nvidia_config, extract_json_from_text
except ImportError:
    from services.context_aggregator import aggregate_plant_context
    from services.nvidia_nemotron_service import get_nvidia_config, extract_json_from_text

logger = logging.getLogger("growwise.coach")


def _generate_deterministic_coach_reply(
    context_data: Dict[str, Any],
    message: str
) -> Dict[str, Any]:
    """
    Fallback expert agronomic reasoning engine when NVIDIA cloud API is offline or unconfigured.
    Synthesizes species-tailored, scientifically grounded advice from the 10-dimension context.
    """
    dims = context_data.get("dimensions", {})
    plant = dims.get("plant_profile", {})
    plant_name = plant.get("name") or plant.get("plant_name", "Urban Plant")
    species = plant.get("species", "Botanical specimen")
    plant_type = plant.get("plant_type", "Crop")
    age = dims.get("plant_age", {}).get("age_days", 30)
    stage = dims.get("plant_age", {}).get("growth_stage", "vegetative")
    pot_size = dims.get("soil_and_moisture", {}).get("pot_size_liters", 7.5)
    
    disease = dims.get("pathology_and_disease", {})
    disease_name = disease.get("disease_name", "Healthy Plant Leaf")
    is_healthy = disease.get("is_healthy", True)
    severity = disease.get("severity", "none")
    symptoms = disease.get("symptoms", "")

    weather = dims.get("environmental_weather", {})
    temp = weather.get("temperature", 24)
    humidity = weather.get("humidity", 55)

    watering = context_data.get("watering_engine_recommendation", {})
    target_ml = watering.get("recommended_amount_ml", 250)
    scheduled_date = watering.get("recommended_date", "Today")

    msg_lower = message.lower()

    # Contextual topic matching
    if any(k in msg_lower for k in ["water", "irrigation", "dry", "moist", "hydrate"]):
        reply = (
            f"For your **{plant_name}** ({species}), current irrigation is deterministically calibrated to **{target_ml} ml** scheduled for **{scheduled_date}**. "
            f"At {age} days old in the *{stage}* stage within a {pot_size}L container, water uptake is influenced by ambient conditions ({temp}°C with {humidity}% relative humidity). "
            f"Always direct irrigation onto the root-zone collar rather than overhead foliage to avoid microclimatic spore germination."
        )
        takeaway = "Root-zone sub-surface watering maximizes transpiration efficiency and keeps foliage dry against fungal colonization."
        action = f"Verify top 2 cm soil dryness, then apply exactly {target_ml} ml around the container perimeter."
        follow_ups = [
            "How do I recognize overwatering symptoms?",
            f"Does a {pot_size}L container dry out faster on warm days?",
            "Should I mist the leaves in the morning?"
        ]

    elif any(k in msg_lower for k in ["prun", "cut", "trim", "pinch", "harvest"]):
        reply = (
            f"When pruning your **{plant_name}** ({species}), prioritize removing any senescent or diseased leaves first. "
            f"During the *{stage}* growth phase, selective pruning improves canopy airflow by 40% and redirects energy to vigorous apical shoots. "
            f"Always sterilize shears with 70% isopropyl alcohol before and after each cut to avoid cross-inoculation of {disease_name if not is_healthy else 'pathogens'}."
        )
        takeaway = "Sterile pruning creates clean callus tissue and optimizes light penetration through the inner canopy."
        action = "Prune only bottom yellowing foliage in the morning, making 45-degree angle cuts 5mm above leaf nodes."
        follow_ups = [
            "How much of the total canopy can I safely remove at once?",
            "What should I do with discarded clippings?",
            "Does pruning stimulate new flowering branches?"
        ]

    elif any(k in msg_lower for k in ["disease", "spray", "treatment", "fungus", "blight", "spot", "bug", "pest"]):
        if not is_healthy:
            reply = (
                f"Your **{plant_name}** is currently managing **{disease_name}** ({severity} severity). "
                f"Observed foliar markers: *{symptoms or 'Active tissue stress'}*. "
                f"For organic containment, avoid harsh chemicals that kill beneficial soil microbes. Apply organic cold-pressed neem oil (0.5% concentration with mild horticultural soap) "
                f"or potassium bicarbonate solution in the cool late evening to prevent phototoxicity."
            )
            takeaway = f"Managing {disease_name} requires interrupting pathogen reproduction cycles with organic contact controls applied during twilight."
            action = "Spray affected foliage undersides in twilight hours; isolate the container 1 meter from neighbors."
            follow_ups = [
                "How frequently should I reapply the organic spray?",
                "Will spraying in direct sunlight burn the foliage?",
                "When will I know the plant is fully recovered?"
            ]
        else:
            reply = (
                f"Great news! Your **{plant_name}** ({species}) has no active disease indicators and is verified healthy. "
                f"To maintain natural systemic resistance, focus on preventive hygiene: ensure 10–15 cm spacing around the pot for cross-ventilation, "
                f"and apply diluted organic compost tea or seaweed extract once every 3 weeks."
            )
            takeaway = "Proactive canopy airflow and balanced root nutrition are 10x more effective than curative pest interventions."
            action = "Wipe dusty leaf surfaces gently with clean damp cloth to boost photosynthetic photon capture."
            follow_ups = [
                "What companion plants naturally deter urban pests?",
                "How does compost tea strengthen plant immunity?",
                "What early warning signs should I watch out for?"
            ]

    elif any(k in msg_lower for k in ["fertiliz", "feed", "nutrient", "soil", "compost", "yellow"]):
        reply = (
            f"Your **{plant_name}** ({species}) at {age} days is in its *{stage}* growth stage. "
            f"Container soils ({pot_size}L) experience rapid nutrient leaching compared to in-ground beds. "
            f"Provide a balanced organic feed high in nitrogen for vegetative leaves, shifting toward potassium and phosphorus once budding begins. "
            f"Micro-nutrients like magnesium and iron prevent interveinal chlorosis."
        )
        takeaway = "Container root zones thrive on small, frequent organic feeds rather than heavy sporadic chemical doses."
        action = "Top-dress the container with 2 tablespoons of organic worm castings or aged compost."
        follow_ups = [
            "How do I balance nitrogen vs phosphorus during flowering?",
            "What causes yellow leaf margins in potted crops?",
            "Can I make organic fertilizer from kitchen scraps?"
        ]

    else:
        # General expert coaching
        status_text = f"managing {disease_name}" if not is_healthy else "in vigorous healthy growth"
        reply = (
            f"As your Urban Plant Coach, I'm monitoring your **{plant_name}** ({species}), which is currently {status_text} "
            f"at {age} days old in a {pot_size}L container. With current ambient conditions at {temp}°C and {humidity}% humidity, "
            f"the calibrated watering engine targets **{target_ml} ml** on **{scheduled_date}**. "
            f"Every urban plant responds dynamically to light, air movement, and soil hydrology. How can I assist you with specific care techniques today?"
        )
        takeaway = "Urban microclimates fluctuate quickly; aligning irrigation and observation with plant growth stages ensures long-term vitality."
        action = f"Check the soil surface moisture and confirm the container drainage tray is free of standing water."
        follow_ups = [
            f"What is the ideal light schedule for {species}?",
            "How should I adjust watering if temperatures rise?",
            "What organic treatments promote root expansion?"
        ]

    return {
        "reply": reply,
        "knowledge_takeaway": takeaway,
        "actionable_step": action,
        "suggested_follow_ups": follow_ups,
        "engine_used": "GrowWise Botanical Expert System",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


async def ask_plant_coach(
    plant_id: int,
    message: str,
    history: Optional[List[Dict[str, str]]] = None,
    supabase: Optional[Client] = None
) -> Dict[str, Any]:
    """
    Interactive Plant Coach Conversational Endpoint.
    Grounded in the real 10-dimension plant context and powered by NVIDIA Nemotron AI.
    """
    history = history or []
    
    # 1. Fetch live 10-dimension agronomic context
    context_data = await aggregate_plant_context(plant_id, supabase)
    dims = context_data.get("dimensions", {})
    plant = dims.get("plant_profile", {})
    plant_name = plant.get("name") or plant.get("plant_name", "Urban Plant")
    species = plant.get("species", "Botanical specimen")
    age = dims.get("plant_age", {}).get("age_days", 30)
    stage = dims.get("plant_age", {}).get("growth_stage", "vegetative")
    pot_size = dims.get("soil_and_moisture", {}).get("pot_size_liters", 7.5)
    
    disease = dims.get("pathology_and_disease", {})
    disease_name = disease.get("disease_name", "Healthy Plant Leaf")
    is_healthy = disease.get("is_healthy", True)
    severity = disease.get("severity", "none")
    symptoms = disease.get("symptoms", "None")

    weather = dims.get("environmental_weather", {})
    temp = weather.get("temperature", 24)
    humidity = weather.get("humidity", 55)

    watering = context_data.get("watering_engine_recommendation", {})
    target_ml = watering.get("recommended_amount_ml", 250)
    scheduled_date = watering.get("recommended_date", "Today")

    cfg = get_nvidia_config()

    # 2. Attempt NVIDIA Nemotron reasoning if cloud API is configured
    if cfg["has_api_key"]:
        try:
            system_prompt = (
                "You are the 👑 GrowWise AI Plant Coach & Master Urban Agronomist.\n"
                "You are speaking directly with an urban grower about their specific plant.\n\n"
                "VERIFIED AGRONOMIC GROUNDING (STRICT):\n"
                f"- Plant Name: {plant_name}\n"
                f"- Species: {species}\n"
                f"- Age: {age} days old (Growth Stage: {stage})\n"
                f"- Container Volume: {pot_size} Liters\n"
                f"- Active Pathology: {disease_name} (Healthy: {is_healthy}, Severity: {severity})\n"
                f"- Observed Symptoms: {symptoms}\n"
                f"- Microclimate: {temp}°C, {humidity}% humidity\n"
                f"- Deterministic Irrigation: {target_ml} ml on {scheduled_date}\n\n"
                "GUIDELINES:\n"
                "1. Always respect the deterministic watering target and verified pathology.\n"
                "2. Provide clear botanical knowledge transfer explaining the biological 'WHY'.\n"
                "3. Emphasize organic, non-destructive cultural and biological interventions.\n"
                "4. Output MUST be ONLY a single valid JSON object matching this exact schema:\n"
                "{\n"
                '  "reply": "Warm, encouraging, scientifically grounded response (2-3 concise paragraphs)",\n'
                '  "knowledge_takeaway": "One-sentence core agronomic rule of thumb",\n'
                '  "actionable_step": "Concrete physical task to execute today",\n'
                '  "suggested_follow_ups": ["Follow-up question 1", "Follow-up question 2", "Follow-up question 3"]\n'
                "}"
            )

            messages = [{"role": "system", "content": system_prompt}]
            # Append last 4 messages of history for contextual continuity
            for h in history[-4:]:
                if h.get("role") in ("user", "assistant") and h.get("content"):
                    messages.append({"role": h["role"], "content": h["content"]})
            messages.append({"role": "user", "content": message})

            headers = {
                "Authorization": f"Bearer {cfg['api_key']}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": cfg["model_name"],
                "messages": messages,
                "temperature": 0.3,
                "top_p": 0.9,
                "max_tokens": 1500,
            }

            async with httpx.AsyncClient(timeout=min(cfg.get("timeout", 30.0), 15.0)) as client:
                res = await client.post(
                    f"{cfg['base_url']}/chat/completions",
                    headers=headers,
                    json=payload
                )
                if res.status_code == 200:
                    data = res.json()
                    raw_content = data["choices"][0]["message"]["content"]
                    parsed = extract_json_from_text(raw_content)
                    if isinstance(parsed, dict) and "reply" in parsed:
                        return {
                            "reply": parsed.get("reply", ""),
                            "knowledge_takeaway": parsed.get("knowledge_takeaway", "Inspect plant daily and respect moisture needs."),
                            "actionable_step": parsed.get("actionable_step", f"Verify topsoil dryness before applying {target_ml} ml."),
                            "suggested_follow_ups": parsed.get("suggested_follow_ups", [
                                "How do I recognize early disease signs?",
                                "What organic fertilizer supports root growth?",
                                "How do weather shifts impact irrigation?"
                            ]),
                            "engine_used": "NVIDIA Nemotron 3.5 AI",
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        }
        except Exception as exc:
            logger.warning(f"NVIDIA Coach API call encountered error: {exc}. Using deterministic botanical expert.")

    # 3. Fallback to rich deterministic agronomic reasoning
    return _generate_deterministic_coach_reply(context_data, message)


async def get_plant_knowledge_transfer(
    plant_id: int,
    supabase: Optional[Client] = None
) -> Dict[str, Any]:
    """
    Returns 5 structured agronomic knowledge transfer modules tailored to the plant.
    Transforms clinical diagnostic metrics into actionable urban farming masterclasses.
    """
    context_data = await aggregate_plant_context(plant_id, supabase)
    dims = context_data.get("dimensions", {})
    plant = dims.get("plant_profile", {})
    plant_name = plant.get("name") or plant.get("plant_name", "Urban Plant")
    species = plant.get("species", "Botanical Specimen")
    plant_type = plant.get("plant_type", "Crop")
    pot_size = dims.get("soil_and_moisture", {}).get("pot_size_liters", 7.5)
    
    disease = dims.get("pathology_and_disease", {})
    disease_name = disease.get("disease_name", "Healthy Plant Leaf")
    is_healthy = disease.get("is_healthy", True)
    severity = disease.get("severity", "none")

    weather = dims.get("environmental_weather", {})
    temp = weather.get("temperature", 24)
    humidity = weather.get("humidity", 55)

    modules = [
        {
            "id": "root_zone_dynamics",
            "title": "Root Zone Hydrology & Container Aeration",
            "category": "Edaphic Science",
            "icon": "Layers",
            "summary": f"How a {pot_size}L container root environment governs moisture, capillary pull, and oxygen diffusion for {plant_name}.",
            "key_principles": [
                f"Container volume of {pot_size}L creates a perched water table at the base; drainage holes must remain completely unobstructed.",
                "Root hairs absorb minerals via active transport which requires continuous aerobic respiration in the rhizosphere.",
                "Over-saturation displaces soil oxygen within 24 hours, predisposing fine feeder roots to anaerobic rot."
            ],
            "practical_action": "Elevate container 1 cm using pot risers to allow unrestricted drainage airflow underneath.",
            "botanical_science_note": "Roots require minimum 10-15% air-filled porosity in potting mix to sustain ATP production for nutrient uptake."
        },
        {
            "id": "photobiology_and_vpd",
            "title": "Photobiology & Vapor Pressure Deficit (VPD)",
            "category": "Microclimate Science",
            "icon": "Sun",
            "summary": f"Balancing light absorption and transpiration rates under current urban weather ({temp}°C, {humidity}% RH).",
            "key_principles": [
                f"At {temp}°C with {humidity}% humidity, transpiration rate is stable; high wind increases foliar moisture pull.",
                "Stomata open in response to morning blue photons and close during midday thermal peaks to avoid desiccation.",
                "Direct afternoon scorching can elevate leaf surface temperatures 4–6°C above ambient air temperature."
            ],
            "practical_action": "Position container where it receives intense morning light (6:00–11:00 AM) and filtered shade during 1:00–3:00 PM.",
            "botanical_science_note": "Transpiration pull pulls calcium ions passively from roots to leaf margins; stagnant humid air creates calcium deficiency."
        },
        {
            "id": "organic_nutrition",
            "title": "Organic Bio-Stimulants & Nutrient Cycling",
            "category": "Plant Nutrition",
            "icon": "Sprout",
            "summary": f"Feeding the soil microbiome to deliver bioavailable Nitrogen, Phosphorus, Potassium, and trace minerals to {species}.",
            "key_principles": [
                "Organic nutrients must be mineralized by mycorrhizae and beneficial bacteria before root absorption.",
                "Excessive synthetic nitrogen causes rapid succulent growth with thin cell walls, attracting sucking pests.",
                "Seaweed kelp extract supplies cytokinins and potassium that harden leaf cuticle thickness against pathogen penetration."
            ],
            "practical_action": "Apply cold-pressed seaweed extract (1:500 dilution) as a soil drench every 21 days during active growth.",
            "botanical_science_note": "Humic and fulvic acids chelate micronutrients like Iron and Zinc, preventing lock-out in container soils."
        },
        {
            "id": "pathogen_defense_sar",
            "title": "Systemic Acquired Resistance (SAR) & Pathology",
            "category": "Plant Immunity",
            "icon": "ShieldAlert",
            "summary": f"How {plant_name} initiates systemic chemical defenses against foliar stress and {disease_name}.",
            "key_principles": [
                f"Active status: {disease_name} ({severity} severity). Plant tissues deploy salicylic acid cascades to wall off infected cells.",
                "Organic potassium bicarbonate raises leaf surface pH to 8.2, disrupting fungal spore cell membranes on contact.",
                "Wetting foliage during irrigation dissolves the natural hydrophobic wax layer that shields leaves from spore adhesion."
            ],
            "practical_action": f"{'Apply organic antifungal potassium bicarbonate spray at dusk' if not is_healthy else 'Keep leaves completely dry during watering to preserve the cuticle barrier'}.",
            "botanical_science_note": "Systemic Acquired Resistance (SAR) primes uninfected leaves throughout the plant to synthesize chitinase enzymes."
        },
        {
            "id": "companion_ecology",
            "title": "Companion Planting & Urban Pest Barriers",
            "category": "Ecological Gardening",
            "icon": "Users",
            "summary": f"Using biodiversity to mask {plant_name}'s volatile scent profiles and attract predatory beneficial insects.",
            "key_principles": [
                "Aromatic companion herbs (basil, mint, chives) emit terpene volatiles that confuse aphids and whiteflies.",
                "Flowering companions (alyssum, dill) provide nectar for beneficial predatory hoverflies and lacewings.",
                "Intercropping prevents pest mono-cultures from spreading unchecked across small urban balcony gardens."
            ],
            "practical_action": "Place a small container of French marigolds or sweet alyssum adjacent to this pot to attract predatory hoverflies.",
            "botanical_science_note": "Root exudates from companion species stimulate diverse microbial consortia that suppress soil-borne pathogens."
        }
    ]

    return {
        "plant_id": plant_id,
        "plant_name": plant_name,
        "species": species,
        "active_diagnosis": disease_name,
        "is_healthy": is_healthy,
        "severity": severity,
        "modules": modules,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }
