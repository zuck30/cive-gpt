from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from groq import Groq
import os
import time
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict
import logging
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CiveGpt API", version="2.0.0", description="UDOM Campus AI Assistant")

# CORS setup for frontend
origins = [
    "https://civegpt.netlify.app",  
    "http://localhost:3000",
    "http://localhost:3001",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Groq API client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# UDOM Campus Data
UDOM_CAMPUSES = {
    "main": {
        "name": "Main Campus",
        "location": {"lat": -6.165917, "lng": 35.743553},
        "address": "P.O. Box 338, Dodoma, Tanzania",
        "departments": ["Engineering", "Science", "Education", "Business", "Humanities"],
        "facilities": ["Library", "Admin Block", "Lecture Halls", "Hostels", "Cafeteria", "Sports Complex"]
    },
    "health": {
        "name": "Health Sciences Campus", 
        "location": {"lat": -6.160083, "lng": 35.749667},
        "address": "Mlimwa, Dodoma",
        "departments": ["Medicine", "Nursing", "Pharmacy", "Dentistry", "Public Health"],
        "facilities": ["Medical Library", "Labs", "Teaching Hospital", "Research Center", "Clinical Skills Lab"]
    },
    "engineering": {
        "name": "Engineering Campus",
        "location": {"lat": -6.170250, "lng": 35.740833},
        "address": "Nkuhungu, Dodoma",
        "departments": ["Civil Engineering", "Electrical", "Mechanical", "Mining", "Computer Engineering"],
        "facilities": ["Workshops", "Engineering Labs", "Design Studios", "Innovation Hub", "Computer Labs"]
    }
}

# Emergency contacts and important numbers
EMERGENCY_CONTACTS = {
    "en": {
        "campus_security": "0755123456",
        "medical_emergency": "112",
        "fire_emergency": "114",
        "student_affairs": "0755123457",
        "academic_office": "0755123458"
    },
    "sw": {
        "campus_security": "0755123456",
        "dharura_ya_kiafya": "112",
        "dharura_ya_moto": "114",
        "masuala_ya_wanafunzi": "0755123457",
        "ofisi_ya_masomo": "0755123458"
    }
}

class ChatRequest(BaseModel):
    message: str
    language: str = "English"
    history: Optional[List[Dict]] = None
    context: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    response_time: float
    model: str
    suggestions: Optional[List[str]] = None
    resources: Optional[List[Dict]] = None

class CampusInfoRequest(BaseModel):
    campus_id: str
    language: str = "English"

def detect_query_type(message: str, language: str) -> Dict:
    """Detect the type of query to provide better responses."""
    message_lower = message.lower()
    
    query_types = {
        "navigation": {
            "en": ["where is", "how to get to", "location of", "directions to", "find", "locate"],
            "sw": ["iko wapi", "nafika vipi", "mahali pa", "uelekeo wa", "tafuta", "patia"]
        },
        "academics": {
            "en": ["timetable", "exam", "course", "lecture", "professor", "assignment", "deadline"],
            "sw": ["ratiba", "mtihani", "kozi", "mhadhara", "profesa", "kazi", "muda"]
        },
        "emergency": {
            "en": ["emergency", "help", "urgent", "security", "danger", "accident"],
            "sw": ["dharura", "msaada", "haraka", "usalama", "hatari", "ajali"]
        },
        "career": {
            "en": ["job", "career", "internship", "employment", "cv", "resume", "interview"],
            "sw": ["kazi", "ajira", "internship", "kuajiriwa", "cv", "wasifu", "mahojiano"]
        },
        "facilities": {
            "en": ["library", "hostel", "cafeteria", "lab", "sports", "gym", "medical"],
            "sw": ["maktaba", "hosteli", "mikahawa", "maabara", "michezo", "ukumbi", "kliniki"]
        }
    }
    
    detected_types = []
    for query_type, keywords in query_types.items():
        lang_key = "sw" if language == "Swahili" else "en"
        if any(keyword in message_lower for keyword in keywords[lang_key]):
            detected_types.append(query_type)
    
    return {
        "types": detected_types,
        "is_emergency": "emergency" in detected_types
    }

def get_system_prompt(language: str, query_types: List[str]) -> str:
    """Get appropriate system prompt based on language and query type."""
    
    base_prompt_sw = """Wewe ni CiveGPT, msaidizi wa AKILI wa kampasi ya Chuo Kikuu cha Dodoma (UDOM). 
Jukumu lako ni kusaidia wanafunzi na wafanyikazi wa UDOM kwa:

1. Uelekezo wa kampasi na ramani
2. Masuala ya masomo na kimasomo
3. Mwongozo wa kazi na taaluma
4. Huduma za kampasi na rasilimali
5. Usalama na mawasiliano ya dharura

MIONGOZO MUHIMU:
- Toa taarifa sahihi za UDOM pekee
- Kwa maswali magumu, pendekeza kuwasiliana na ofisi husika
- Kwa dharura, toa namba za mawasiliano haraka
- Rejelea rasilimali halisi za UDOM (tovuti, ratiba, nk)
- Waonye watumiaji kuhakikisha taarifa kwenye chanzo rasmi

Jibu kwa lugha ya Kiswahili yenye heshima na ushirikiano."""

    base_prompt_en = """You are CiveGPT, the AI assistant for University of Dodoma (UDOM) campus.
Your role is to assist UDOM students and staff with:

1. Campus navigation and maps
2. Academic and educational matters
3. Career and professional guidance
4. Campus services and resources
5. Safety and emergency communications

CRITICAL GUIDELINES:
- Provide accurate UDOM-specific information only
- For complex queries, recommend contacting relevant offices
- For emergencies, provide immediate contact numbers
- Reference actual UDOM resources (website, timetable, etc.)
- Advise users to verify information with official sources

Respond in respectful and collaborative English."""

    # Add context based on detected query types
    context_additions_sw = {
        "navigation": "Kikokotoo cha uelekezo wa kampasi. Toa maelekezo sahihi ya maeneo kwenye kampasi.",
        "academics": "Mtaalamu wa masomo. Rejelea rasilimali za kimasomo na ratiba za UDOM.",
        "emergency": "Mfumo wa usaidizi wa dharura. Toa namba za mawasiliano haraka na ushauri wa usalama.",
        "career": "Mshauri wa kazi. Wasiliana na ofisi ya ajira na rasilimali za taaluma.",
        "facilities": "Mtaalamu wa rasilimali za kampasi. Elezea huduma zinazopatikana."
    }
    
    context_additions_en = {
        "navigation": "Campus navigation expert. Provide accurate directions to campus locations.",
        "academics": "Academic specialist. Reference UDOM academic resources and timetables.",
        "emergency": "Emergency support system. Provide immediate contact numbers and safety advice.",
        "career": "Career advisor. Connect with employment office and professional resources.",
        "facilities": "Campus facilities expert. Describe available services and resources."
    }
    
    base_prompt = base_prompt_sw if language == "Swahili" else base_prompt_en
    context_additions = context_additions_sw if language == "Swahili" else context_additions_en
    
    additional_context = ""
    for query_type in query_types:
        if query_type in context_additions:
            additional_context += f"\n{context_additions[query_type]}"
    
    return base_prompt + additional_context

def get_user_prompt(message: str, language: str, query_types: List[str], is_emergency: bool) -> str:
    """Construct optimized user prompt for campus-related queries."""
    
    if language == "Swahili":
        emergency_note = "**DHARURA:** Hii ni swali la dharura. " if is_emergency else ""
        
        return f"""{emergency_note}Swali la mwanafunzi wa UDOM:

"{message}"

Tafadhali toa:
- Jibu la moja kwa moja linalohusika na UDOM
- Maelekezo ya vitendo (kama inafaa)
- Rasilimali husika za UDOM (tovuti, namba, nk)
- Ushauri wa ziada unaohitajika

Jibu kwa Kiswahili kwa muundo wazi na rahisi kusoma."""
    else:
        emergency_note = "**EMERGENCY:** This is an urgent query. " if is_emergency else ""
        
        return f"""{emergency_note}UDOM student query:

"{message}"

Please provide:
- Direct UDOM-specific response
- Actionable guidance (if applicable)
- Relevant UDOM resources (websites, numbers, etc.)
- Any additional needed advice

Respond in clear, easy-to-read format in {language}."""

def get_suggestions(query_types: List[str], language: str) -> List[str]:
    """Get relevant follow-up suggestions based on query type."""
    
    suggestions_en = {
        "navigation": [
            "Show me the campus map",
            "How do I get to the library?",
            "Where is the nearest cafeteria?",
            "Directions to lecture halls"
        ],
        "academics": [
            "Download timetable",
            "Exam schedule",
            "Course registration help",
            "Academic calendar dates"
        ],
        "emergency": [
            "Campus security number",
            "Medical emergency contacts",
            "Student affairs office",
            "Emergency procedures"
        ],
        "career": [
            "Internship opportunities",
            "Career counseling",
            "Job application help",
            "Resume building"
        ],
        "facilities": [
            "Library hours",
            "Hostel information",
            "Sports facilities",
            "Medical services"
        ]
    }
    
    suggestions_sw = {
        "navigation": [
            "Nionyeshe ramani ya kampasi",
            "Nawezaje kufika maktabani?",
            "Mkahawa wa karibu uko wapi?",
            "Maelekezo kwenye vyumba vya mihadhara"
        ],
        "academics": [
            "Pakua ratiba",
            "Ratiba ya mitihani",
            "Usaidizi wa usajili wa kozi",
            "Tarehe za kalenda ya masomo"
        ],
        "emergency": [
            "Namba ya usalama wa kampasi",
            "Mawasiliano ya dharura ya kiafya",
            "Ofisi ya masuala ya wanafunzi",
            "Taratibu za dharura"
        ],
        "career": [
            "Fursa za internship",
            "Usaidizi wa mwongozo wa kazi",
            "Usaidizi wa maombi ya kazi",
            "Kutengeneza wasifu"
        ],
        "facilities": [
            "Muda wa kufungua maktaba",
            "Taarifa za hosteli",
            "Vifaa vya michezo",
            "Huduma za kiafya"
        ]
    }
    
    suggestions = suggestions_sw if language == "Swahili" else suggestions_en
    result = []
    
    for query_type in query_types:
        if query_type in suggestions:
            result.extend(suggestions[query_type][:2])  # Get top 2 suggestions per type
    
    return list(set(result))[:4]  # Return unique suggestions, max 4

def get_resources(query_types: List[str], language: str) -> List[Dict]:
    """Get relevant UDOM resources based on query type."""
    
    resources_en = {
        "navigation": [
            {"name": "Campus Map", "url": "https://www.udom.ac.tz/campus-map", "type": "map"},
            {"name": "Virtual Tour", "url": "https://www.udom.ac.tz/virtual-tour", "type": "tour"}
        ],
        "academics": [
            {"name": "Timetable Portal", "url": "https://ratiba.udom.ac.tz", "type": "academic"},
            {"name": "Online Library", "url": "https://library.udom.ac.tz", "type": "library"},
            {"name": "Student Portal", "url": "https://portal.udom.ac.tz", "type": "portal"}
        ],
        "emergency": [
            {"name": "Security Office", "url": "tel:0755123456", "type": "contact"},
            {"name": "Medical Center", "url": "tel:112", "type": "contact"}
        ],
        "career": [
            {"name": "Career Office", "url": "https://www.udom.ac.tz/career", "type": "career"},
            {"name": "Internship Portal", "url": "https://www.udom.ac.tz/internships", "type": "opportunities"}
        ],
        "facilities": [
            {"name": "Facilities Guide", "url": "https://www.udom.ac.tz/facilities", "type": "guide"},
            {"name": "Hostel Booking", "url": "https://www.udom.ac.tz/hostels", "type": "booking"}
        ]
    }
    
    resources_sw = {
        "navigation": [
            {"name": "Ramani ya Kampasi", "url": "https://www.udom.ac.tz/campus-map", "type": "ramani"},
            {"name": "Ziara Mtandaoni", "url": "https://www.udom.ac.tz/virtual-tour", "type": "ziara"}
        ],
        "academics": [
            {"name": "Tovuti ya Ratiba", "url": "https://ratiba.udom.ac.tz", "type": "masomo"},
            {"name": "Maktaba Mtandaoni", "url": "https://library.udom.ac.tz", "type": "maktaba"},
            {"name": "Tovuti ya Mwanafunzi", "url": "https://portal.udom.ac.tz", "type": "tovuti"}
        ],
        "emergency": [
            {"name": "Ofisi ya Usalama", "url": "tel:0755123456", "type": "mawasiliano"},
            {"name": "Kituo cha Afya", "url": "tel:112", "type": "mawasiliano"}
        ],
        "career": [
            {"name": "Ofisi ya Kazi", "url": "https://www.udom.ac.tz/career", "type": "kazi"},
            {"name": "Tovuti ya Internship", "url": "https://www.udom.ac.tz/internships", "type": "fursa"}
        ],
        "facilities": [
            {"name": "Mwongozo wa Vifaa", "url": "https://www.udom.ac.tz/facilities", "type": "mwongozo"},
            {"name": "Kubokea Hosteli", "url": "https://www.udom.ac.tz/hostels", "type": "ukodishaji"}
        ]
    }
    
    resources = resources_sw if language == "Swahili" else resources_en
    result = []
    
    for query_type in query_types:
        if query_type in resources:
            result.extend(resources[query_type])
    
    return result

@app.post("/chat", response_model=ChatResponse)
async def chat_with_civegpt(request: ChatRequest):
    start_time = time.time()
    
    try:
        # Validate input
        if not request.message.strip():
            error_msg = "Tafadhali andika ujumbe." if request.language == "Swahili" else "Please provide a message."
            raise HTTPException(status_code=400, detail=error_msg)

        # Detect query type for better context
        query_info = detect_query_type(request.message, request.language)
        query_types = query_info["types"]
        is_emergency = query_info["is_emergency"]

        logger.info(f"Processing chat request - Language: {request.language}, Types: {query_types}, Emergency: {is_emergency}")

        # Get optimized prompts
        system_prompt = get_system_prompt(request.language, query_types)
        user_prompt = get_user_prompt(request.message, request.language, query_types, is_emergency)

        # Generate response with Groq
        chat_completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system", 
                    "content": system_prompt
                },
                {
                    "role": "user", 
                    "content": user_prompt
                }
            ],
            max_tokens=500,
            temperature=0.7,
            top_p=0.8,
            stream=False,
            timeout=30
        )

        response_text = chat_completion.choices[0].message.content.strip()
        
        # Add emergency contacts if emergency detected
        if is_emergency:
            contacts = EMERGENCY_CONTACTS["sw" if request.language == "Swahili" else "en"]
            emergency_info = "\n\n🚨 **" + ("Nambari za Dharura:" if request.language == "Swahili" else "Emergency Contacts:") + "**\n"
            for service, number in contacts.items():
                emergency_info += f"- {service}: {number}\n"
            response_text += emergency_info

        response_time = time.time() - start_time
        
        # Get suggestions and resources
        suggestions = get_suggestions(query_types, request.language)
        resources = get_resources(query_types, request.language)

        logger.info(f"Chat request processed successfully in {response_time:.2f}s")

        return ChatResponse(
            response=response_text,
            response_time=round(response_time, 2),
            model="llama-3.3-70b-versatile",
            suggestions=suggestions,
            resources=resources
        )

    except HTTPException:
        raise
    except Exception as e:
        response_time = time.time() - start_time
        logger.error(f"Error processing chat request: {str(e)}")
        
        error_msg = (
            "Samahani, kuna hitilafu katika mfumo. Tafadhali jaribu tena."
            if request.language == "Swahili" 
            else "Sorry, there's a system error. Please try again."
        )
        
        raise HTTPException(
            status_code=500, 
            detail={
                "error": error_msg,
                "response_time": round(response_time, 2)
            }
        )

@app.get("/campuses")
async def get_campuses():
    """Get all UDOM campuses information."""
    return {
        "campuses": UDOM_CAMPUSES,
        "total_campuses": len(UDOM_CAMPUSES)
    }

@app.post("/campus/{campus_id}")
async def get_campus_info(campus_id: str, request: CampusInfoRequest):
    """Get specific campus information."""
    if campus_id not in UDOM_CAMPUSES:
        error_msg = "Kampasi haijapatikana." if request.language == "Swahili" else "Campus not found."
        raise HTTPException(status_code=404, detail=error_msg)
    
    campus = UDOM_CAMPUSES[campus_id]
    
    # Add language-specific descriptions
    if request.language == "Swahili":
        campus["description"] = f"Kampasi kuu ya {campus['name']} ya Chuo Kikuu cha Dodoma."
    else:
        campus["description"] = f"Main {campus['name']} of University of Dodoma."
    
    return campus

@app.get("/emergency-contacts")
async def get_emergency_contacts(language: str = "English"):
    """Get emergency contact numbers."""
    contacts = EMERGENCY_CONTACTS["sw" if language == "Swahili" else "en"]
    return {
        "language": language,
        "contacts": contacts,
        "note": "Call these numbers for immediate assistance" if language == "English" else "Piga namba hizi kwa usaidizi wa haraka"
    }

@app.get("/academic-resources")
async def get_academic_resources(language: str = "English"):
    """Get UDOM academic resources."""
    resources_en = {
        "timetable": "https://ratiba.udom.ac.tz",
        "library": "https://library.udom.ac.tz",
        "student_portal": "https://portal.udom.ac.tz",
        "online_learning": "https://elearning.udom.ac.tz",
        "academic_calendar": "https://www.udom.ac.tz/academic-calendar"
    }
    
    resources_sw = {
        "ratiba": "https://ratiba.udom.ac.tz",
        "maktaba": "https://library.udom.ac.tz",
        "tovuti_ya_wanafunzi": "https://portal.udom.ac.tz",
        "masomo_mtandaoni": "https://elearning.udom.ac.tz",
        "kalenda_ya_masomo": "https://www.udom.ac.tz/academic-calendar"
    }
    
    return {
        "language": language,
        "resources": resources_sw if language == "Swahili" else resources_en
    }

@app.get("/")
async def root():
    return {
        "message": "Welcome to CiveGpt API, College Of Informatics & Virtual Education Artificial Intelligence Assistant",
        "version": "2.0.0",
        "status": "operational",
        "features": [
            "Campus navigation assistance",
            "Academic resources guidance",
            "Career and internship information",
            "Emergency contact services",
            "Multi-language support (English/Swahili)",
            "UDOM-specific information"
        ]
    }

@app.get("/health")
async def health():
    start_time = time.time()
    
    try:
        # Quick test query to verify API connectivity
        test_completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "Say 'CiveGpt OK' if working."}],
            max_tokens=10,
            temperature=0.1
        )
        status = "healthy"
    except Exception as e:
        status = f"degraded: {str(e)}"
    
    response_time = time.time() - start_time
    
    return {
        "status": status,
        "response_time": round(response_time, 2),
        "service": "CiveGpt College Assistant",
        "model": "llama-3.3-70b-versatile"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)