"""
Care Guidance Service Module — Phase 3
--------------------------------------
Curated, scientifically vetted botanical care and treatment protocols for urban farming.
Provides deterministic, approved guidance for plant diseases, nutrient deficiencies,
pest pressures, and preventative vitality protocols.
"""

from typing import Dict, Any, List, Optional
import re


# Clinical Disease Care Knowledge Base
CARE_PROTOCOLS = {
    "early blight": {
        "condition_name": "Early Blight (Alternaria solani)",
        "category": "Fungal Infection",
        "urgency": "high",
        "immediate_actions": [
            "Prune and discard all lower infected leaves with target spot lesions; do not compost infected foliage.",
            "Sanitize pruning shears with 70% isopropyl alcohol between every cut to prevent cross-contamination.",
            "Cease all overhead watering immediately; apply water strictly to the soil base."
        ],
        "approved_treatments": [
            "Apply approved copper octanoate or copper sulfate fungicide at 7-10 day intervals until new growth is clear.",
            "Apply biological biofungicide (Bacillus subtilis or Bacillus amyloliquefaciens) to suppress spore germination.",
            "Apply neem oil emulsion (0.5% - 1.0%) during early morning or evening hours."
        ],
        "cultural_preventions": [
            "Apply a 2-3 inch organic straw or bark mulch layer around the base to prevent soil-splash onto lower foliage.",
            "Increase plant spacing to improve canopy airflow and decrease leaf wetness duration.",
            "Stake or trellis vines to keep foliage elevated off the soil."
        ],
        "prohibited_actions": [
            "Do not water foliage in late afternoon or evening.",
            "Do not apply high-nitrogen fertilizers which stimulate soft, vulnerable vegetative growth.",
            "Do not work with plants while leaves are wet."
        ],
        "environmental_adjustments": "Maintain dry canopy; position in area with at least 6-8 hours of direct sunlight."
    },
    "late blight": {
        "condition_name": "Late Blight (Phytophthora infestans)",
        "category": "Oomycete Pathogen",
        "urgency": "immediate",
        "immediate_actions": [
            "Immediately isolate the plant from other nightshade family members (tomatoes, peppers, potatoes).",
            "Carefully bag and dispose of heavily water-soaked or dark-brown collapsed stems in household waste."
        ],
        "approved_treatments": [
            "Apply fixed copper fungicide spray covering both upper and lower leaf surfaces.",
            "If severe systemic infection has collapsed main stems, harvest unaffected fruit and safely destroy plant."
        ],
        "cultural_preventions": [
            "Ensure excellent container drainage; avoid poorly drained standing water.",
            "Grow blight-resistant varieties for future plantings.",
            "Ensure maximum air circulation."
        ],
        "prohibited_actions": [
            "Do not compost infected plant debris.",
            "Do not allow wet leaves during cool, foggy, or humid weather."
        ],
        "environmental_adjustments": "Move to a sheltered, warm location protected from prolonged rain."
    },
    "powdery mildew": {
        "condition_name": "Powdery Mildew (Erysiphaceae)",
        "category": "Fungal Infection",
        "urgency": "medium",
        "immediate_actions": [
            "Remove severely coated leaves showing dense white mycelial powder.",
            "Relocate container to a sunnier, well-ventilated spot."
        ],
        "approved_treatments": [
            "Spray with potassium bicarbonate solution (3 tablespoons per gallon with 1 tsp horticultural soap).",
            "Apply sulfur-based garden fungicide (only when temperature is below 30°C / 86°F).",
            "Apply dilute horticultural oil or neem oil spray thoroughly on foliage."
        ],
        "cultural_preventions": [
            "Thin interior branches to increase sunlight penetration into the dense center of the canopy.",
            "Space pots at least 18-24 inches apart."
        ],
        "prohibited_actions": [
            "Do not spray sulfur within 30 days of oil-based sprays to prevent phytotoxic leaf burn.",
            "Do not apply sulfur during high heat (>30°C)."
        ],
        "environmental_adjustments": "Increase direct sunlight exposure and breeze."
    },
    "leaf spot": {
        "condition_name": "Leaf Spot / Septoria (Septoria lycopersici)",
        "category": "Fungal / Bacterial Spot",
        "urgency": "medium",
        "immediate_actions": [
            "Pinch off spotted leaves starting from the base of the plant.",
            "Wash hands and shears thoroughly after handling."
        ],
        "approved_treatments": [
            "Apply liquid copper fungicide or broad-spectrum bio-fungicide.",
            "Ensure weekly protective spray until new upper foliage is established."
        ],
        "cultural_preventions": [
            "Maintain soil mulch barrier.",
            "Bottom-water with drip or saucer irrigation."
        ],
        "prohibited_actions": [
            "Do not splash soil onto stems when watering."
        ],
        "environmental_adjustments": "Ensure full morning sun to rapidly dry dew from leaves."
    },
    "root rot": {
        "condition_name": "Root Rot / Overwatering Stress",
        "category": "Physiological / Fungal Root Disease",
        "urgency": "high",
        "immediate_actions": [
            "Cease watering completely until the root ball and top 2-3 inches of potting mix dry thoroughly.",
            "Verify container drainage holes are completely unobstructed.",
            "If in standing water saucers, empty saucers immediately."
        ],
        "approved_treatments": [
            "Drench root zone with hydrogen peroxide 3% solution (1 part H2O2 to 4 parts water) to oxygenate roots and inhibit anaerobic Pythium.",
            "If severe, unpot plant, trim blackened mushy roots with sterilized scissors, and repot in fresh, well-aerated potting mix."
        ],
        "cultural_preventions": [
            "Use container mixes with perlite, pumice, or pine bark for 30%+ aeration.",
            "Always use containers with ample drainage holes."
        ],
        "prohibited_actions": [
            "Do not water according to a rigid calendar without checking soil moisture first.",
            "Do not leave pots sitting in drainage runoff."
        ],
        "environmental_adjustments": "Elevate container on pot feet to encourage bottom airflow and drainage."
    },
    "aphids": {
        "condition_name": "Aphid Infestation",
        "category": "Insect Pest",
        "urgency": "medium",
        "immediate_actions": [
            "Blast foliage undersides with a firm stream of water to dislodge clusters of aphids.",
            "Check for ant activity which may be farming the aphids."
        ],
        "approved_treatments": [
            "Spray insecticidal soap (potassium salts of fatty acids) directly onto clusters.",
            "Apply 1% cold-pressed neem oil spray in the evening.",
            "Introduce beneficial insects (ladybug larvae or lacewings) in outdoor gardens."
        ],
        "cultural_preventions": [
            "Avoid over-fertilizing with quick-release synthetic nitrogen.",
            "Plant companion herbs such as sweet alyssum or dill to attract hoverflies."
        ],
        "prohibited_actions": [
            "Do not use broad-spectrum synthetic neurotoxins that eliminate beneficial predatory insects."
        ],
        "environmental_adjustments": "Inspect young shoots twice weekly."
    },
    "spider mites": {
        "condition_name": "Spider Mite Infestation (Tetranychidae)",
        "category": "Arachnid Pest",
        "urgency": "medium",
        "immediate_actions": [
            "Wipe leaf undersides with damp cloth or spray with forceful water stream.",
            "Isolate affected container from dry indoor environments."
        ],
        "approved_treatments": [
            "Apply horticultural mineral oil or neem oil spray covering leaf undersides.",
            "Apply insecticidal soap every 3-5 days for 3 cycles to break egg hatch cycles."
        ],
        "cultural_preventions": [
            "Increase ambient humidity around plants (misting or pebble trays).",
            "Keep foliage clean and free of dust."
        ],
        "prohibited_actions": [
            "Do not allow soil to remain bone-dry in hot, stagnant conditions."
        ],
        "environmental_adjustments": "Avoid hot, dry microclimates; improve air moisture."
    },
    "healthy": {
        "condition_name": "Healthy Plant Maintenance Protocol",
        "category": "Optimal Growth & Preventive Care",
        "urgency": "preventative",
        "immediate_actions": [
            "Continue standard monitoring and balanced irrigation.",
            "Rotate container 90 degrees weekly to encourage symmetrical growth towards the light."
        ],
        "approved_treatments": [
            "Apply balanced organic fertilizer (e.g. 5-5-5 or liquid seaweed / fish hydrolysate) at half-strength every 2-3 weeks during active vegetative growth.",
            "Top-dress container with 1 inch of well-rotted organic compost to nourish soil microbiome."
        ],
        "cultural_preventions": [
            "Maintain consistent soil moisture without waterlogging.",
            "Inspect leaf undersides weekly for early pest detection."
        ],
        "prohibited_actions": [
            "Do not over-fertilize during dormant or extreme heat periods.",
            "Do not let soil dry to the point of hydrophobic crusting."
        ],
        "environmental_adjustments": "Maintain optimal sunlight for the species and ensure good container aeration."
    },
    "uncertain": {
        "condition_name": "Inconclusive Observation & Diagnostic Monitoring Protocol",
        "category": "Precautionary Monitoring",
        "urgency": "monitor",
        "immediate_actions": [
            "Monitor plant closely for progressive leaf symptoms without applying chemical or copper treatments prematurely.",
            "Capture a fresh, well-lit, close-up photograph of affected leaf margins in natural daylight for re-evaluation.",
            "Isolate the plant from adjacent containers if rapid foliar browning or wilting develops."
        ],
        "approved_treatments": [
            "Maintain non-invasive cultural management: prune dead or severely decayed tissue conservatively with sterilized shears.",
            "Apply gentle foliar moisture rinse only if dust accumulation is impairing stomata, ensuring rapid morning drying."
        ],
        "cultural_preventions": [
            "Ensure 6-8 inches of unobstructed spacing around container for optimal canopy ventilation.",
            "Maintain strict soil-level watering; avoid wetting foliage."
        ],
        "prohibited_actions": [
            "Do not apply heavy fungicides, synthetic chemicals, or copper treatments without a confirmed disease diagnosis.",
            "Do not over-fertilize or stress compromised root systems with concentrated nutrient salts."
        ],
        "environmental_adjustments": "Position in gentle morning sunlight with moderate airflow; protect from extreme drafts or harsh midday scorch."
    },
    "unknown": {
        "condition_name": "General Botanical Vitality & Environmental Care",
        "category": "General Plant Vitality",
        "urgency": "routine",
        "immediate_actions": [
            "Check soil moisture at root level and verify container drainage holes are clear.",
            "Inspect leaf undersides weekly for emerging signs of pests or lesions."
        ],
        "approved_treatments": [
            "Apply balanced organic compost tea or mild kelp meal to support natural plant immunity.",
            "Top-dress with clean organic mulch to retain soil microbial equilibrium."
        ],
        "cultural_preventions": [
            "Rotate container weekly for uniform sun exposure and symmetrical growth.",
            "Water only when top inch of potting soil feels dry."
        ],
        "prohibited_actions": [
            "Do not apply targeted chemical disease treatments without diagnostic identification."
        ],
        "environmental_adjustments": "Maintain species-appropriate light, ambient humidity, and well-aerated container substrate."
    }
}


def get_approved_care_guidance(
    disease_name: Optional[str] = None,
    is_healthy: bool = False,
    plant_type: Optional[str] = None,
    diagnosis_status: Optional[str] = None,
    confidence: Optional[float] = None
) -> Dict[str, Any]:
    """
    Matches diagnosed plant condition or health state to the scientifically approved
    botanical care and treatment protocol.
    Distinguishes between healthy vitality, confirmed diseases, uncertain/inconclusive
    observations, and unknown conditions without forcing fake diagnosis categories.
    """
    # 1. Uncertain, Inconclusive, or Low Confidence Case
    if diagnosis_status in ("uncertain", "inconclusive", "unconfirmed") or (
        not is_healthy and confidence is not None and confidence < 0.40 and disease_name and "healthy" not in disease_name.lower()
    ):
        protocol = CARE_PROTOCOLS["uncertain"]
        return {
            "condition_name": protocol["condition_name"],
            "condition_matched": protocol["condition_name"],
            "category": protocol["category"],
            "urgency": protocol["urgency"],
            "immediate_actions": protocol["immediate_actions"],
            "approved_treatments": protocol["approved_treatments"],
            "cultural_preventions": protocol["cultural_preventions"],
            "prohibited_actions": protocol["prohibited_actions"],
            "environmental_adjustments": protocol["environmental_adjustments"],
            "is_healthy": False,
            "is_uncertain": True,
            "limitations_note": "Diagnostic findings are currently inconclusive. Safe non-chemical monitoring is prioritized over pesticide intervention."
        }

    # 2. Healthy / Optimal Vitality Case
    if is_healthy or not disease_name or "healthy" in disease_name.lower():
        protocol = CARE_PROTOCOLS["healthy"]
        return {
            "condition_name": protocol["condition_name"],
            "condition_matched": protocol["condition_name"],
            "category": protocol["category"],
            "urgency": protocol["urgency"],
            "immediate_actions": protocol["immediate_actions"],
            "approved_treatments": protocol["approved_treatments"],
            "cultural_preventions": protocol["cultural_preventions"],
            "prohibited_actions": protocol["prohibited_actions"],
            "environmental_adjustments": protocol["environmental_adjustments"],
            "is_healthy": True,
            "is_uncertain": False,
        }

    d_clean = disease_name.lower()

    # 3. Known Supported Clinical Pathogens
    if "early blight" in d_clean:
        protocol = CARE_PROTOCOLS["early blight"]
    elif "late blight" in d_clean:
        protocol = CARE_PROTOCOLS["late blight"]
    elif "powdery mildew" in d_clean:
        protocol = CARE_PROTOCOLS["powdery mildew"]
    elif "leaf spot" in d_clean or "septoria" in d_clean:
        protocol = CARE_PROTOCOLS["leaf spot"]
    elif "rot" in d_clean or "pythium" in d_clean or "overwater" in d_clean:
        protocol = CARE_PROTOCOLS["root rot"]
    elif "aphid" in d_clean:
        protocol = CARE_PROTOCOLS["aphids"]
    elif "mite" in d_clean:
        protocol = CARE_PROTOCOLS["spider mites"]
    elif "blight" in d_clean:
        protocol = CARE_PROTOCOLS["early blight"]
    elif "spot" in d_clean:
        protocol = CARE_PROTOCOLS["leaf spot"]
    else:
        # 4. Unknown / Unsupported Condition -> Use general protocol with explicit limitation!
        protocol = CARE_PROTOCOLS["unknown"]
        return {
            "condition_name": f"{disease_name} (Unverified Condition)",
            "condition_matched": protocol["condition_name"],
            "category": protocol["category"],
            "urgency": protocol["urgency"],
            "immediate_actions": protocol["immediate_actions"],
            "approved_treatments": protocol["approved_treatments"],
            "cultural_preventions": protocol["cultural_preventions"],
            "prohibited_actions": protocol["prohibited_actions"],
            "environmental_adjustments": protocol["environmental_adjustments"],
            "is_healthy": False,
            "is_uncertain": True,
            "limitations_note": f"Condition '{disease_name}' is not in the verified pathogen database. General cultural vitality guidance provided."
        }

    return {
        "condition_name": protocol["condition_name"],
        "condition_matched": protocol["condition_name"],
        "category": protocol["category"],
        "urgency": protocol["urgency"],
        "immediate_actions": protocol["immediate_actions"],
        "approved_treatments": protocol["approved_treatments"],
        "cultural_preventions": protocol["cultural_preventions"],
        "prohibited_actions": protocol["prohibited_actions"],
        "environmental_adjustments": protocol["environmental_adjustments"],
        "is_healthy": False,
        "is_uncertain": False,
    }
