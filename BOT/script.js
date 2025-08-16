// DOM Elements
const chatbotIcon = document.getElementById('chatbot-icon');
const chatbotContainer = document.getElementById('chatbot-container');
const chatbotClose = document.getElementById('chatbot-close');
const deleteHistoryBtn = document.getElementById('delete-history');
const chatbotMessages = document.getElementById('chatbot-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

// Chatbot state
let currentContext = null;
let previousChats = JSON.parse(localStorage.getItem('mkuchatbot_chats')) || [];
let currentSession = [];
let isFirstInteraction = true;
let responseHistory = {};

// Helper function to rotate responses
function getRotatedResponse(context, subContext, responses) {
    if (!responseHistory[context]) responseHistory[context] = {};
    if (!responseHistory[context][subContext]) {
        responseHistory[context][subContext] = 0;
    } else {
        responseHistory[context][subContext] = 
            (responseHistory[context][subContext] + 1) % responses.length;
    }
    return responses[responseHistory[context][subContext]];
}

// Initialize chatbot
function initChatbot() {
    chatbotMessages.innerHTML = '';
    if (isFirstInteraction) {
        showWelcomeMessage();
        isFirstInteraction = false;
    } else if (previousChats.length > 0) {
        showContinuePrompt();
    } else {
        showWelcomeMessage();
    }
    updateDeleteButtonVisibility();
    scrollToBottom();
}

// Show welcome message
function showWelcomeMessage() {
    const welcomeMessage = "Hello! 👋 I'm the MKU Student Assistant. How can I help you today? You can ask about fees, hostels, exam cards, transcripts, or other university services.";
    appendMessage('bot', welcomeMessage);
    showQuickReplies(getContextOptions(null));
}

// Show prompt to continue or start new conversation
function showContinuePrompt() {
    const promptMessage = "Welcome back! Would you like to continue your previous conversation or start a new one?";
    appendMessage('bot', promptMessage);
    showQuickReplies(["Continue previous conversation", "Start new conversation"]);
}

// Append message to chat
function appendMessage(sender, message, saveToHistory = true) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(sender === 'bot' ? 'bot-message' : 'user-message');
    const formattedMessage = message.replace(/\n/g, '<br>');
    messageDiv.innerHTML = formattedMessage;
    chatbotMessages.appendChild(messageDiv);
    currentSession.push({ sender, message });
    if (saveToHistory && (sender === 'user' || (sender === 'bot' && !message.includes("How can I help")))) {
        previousChats.push({ sender, message });
        localStorage.setItem('mkuchatbot_chats', JSON.stringify(previousChats));
        if (currentContext) {
            localStorage.setItem('mkuchatbot_context', currentContext);
        }
    }
    updateDeleteButtonVisibility();
    scrollToBottom();
}

// Show quick reply options
function showQuickReplies(options) {
    const optionsContainer = document.createElement('div');
    optionsContainer.classList.add('quick-replies');
    options.forEach(option => {
        const optionElement = document.createElement('div');
        optionElement.classList.add('quick-reply');
        optionElement.textContent = option;
        optionElement.addEventListener('click', () => {
            userInput.value = option;
            handleUserInput();
        });
        optionsContainer.appendChild(optionElement);
    });
    chatbotMessages.appendChild(optionsContainer);
    scrollToBottom();
}

// Show typing indicator
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('typing-indicator');
    typingDiv.id = 'typing-indicator';
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.classList.add('typing-dot');
        typingDiv.appendChild(dot);
    }
    chatbotMessages.appendChild(typingDiv);
    scrollToBottom();
}

// Hide typing indicator
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Scroll to bottom of chat
function scrollToBottom() {
    setTimeout(() => {
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }, 100);
}

// Handle user input
function handleUserInput() {
    const message = userInput.value.trim();
    
    // Handle blank input
    if (message === '') {
        appendMessage('bot', "Sorry, I didn't understand that.");
        return;
    }
    appendMessage('user', message);
    userInput.value = '';
    showTypingIndicator();
    setTimeout(() => {
        hideTypingIndicator(); 
        if (message === "Continue previous conversation") {
            loadPreviousConversation();
            return;
        }
        if (message === "Start new conversation") {
            startNewConversation();
            return;
        }
        const response = generateResponse(message);
        appendMessage('bot', response.text);
        if (response.context !== currentContext) {
            currentContext = response.context;
            if (currentContext) {
                localStorage.setItem('mkuchatbot_context', currentContext);
            }
        }
        const options = getContextOptions(currentContext, response.subContext);
        if (options && options.length > 0) {
            showQuickReplies(options);
        }
    }, 1000);
}

// Load previous conversation
function loadPreviousConversation() {
    chatbotMessages.innerHTML = '';
    previousChats.forEach(chat => {
        appendMessage(chat.sender, chat.message, false);
    });
    currentContext = localStorage.getItem('mkuchatbot_context') || null;
    if (currentContext) {
        const options = getContextOptions(currentContext);
        showQuickReplies(options);
    } else {
        showQuickReplies(getContextOptions(null));
    }
}

// Start new conversation
function startNewConversation() {
    previousChats = [];
    localStorage.removeItem('mkuchatbot_chats');
    localStorage.removeItem('mkuchatbot_context');
    currentContext = null;
    isFirstInteraction = true;
    chatbotMessages.innerHTML = '';
    showWelcomeMessage();
    updateDeleteButtonVisibility();
}

// Delete conversation history
function deleteHistory() {
    previousChats = [];
    currentSession = [];
    currentContext = null;
    localStorage.removeItem('mkuchatbot_chats');
    localStorage.removeItem('mkuchatbot_context');
    
    // Clear the chat and show welcome message
    chatbotMessages.innerHTML = '';
    showWelcomeMessage();
    updateDeleteButtonVisibility();
}

// Update delete button visibility
function updateDeleteButtonVisibility() {
    if (previousChats.length > 0) {
        deleteHistoryBtn.style.display = 'flex';
    } else {
        deleteHistoryBtn.style.display = 'none';
    }
}

// Generate bot response based on user input
function generateResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // Handle greetings
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('jambo')) {
        return {
            text: "Hello there! How can I help you today?",
            context: currentContext
        };
    }
    
    // Handle thanks
    if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
        return {
            text: "You're welcome! Was just doing my duty, come back again if you need anything else.",
            context: currentContext
        };
    }
    
    // Handle blank input
    if (message.trim() === '') {
        return {
            text: "Sorry, I didn't understand that.",
            context: currentContext
        };
    }
    
    // Handle specific questions
    if (lowerMessage.includes('how can i know my fees') || lowerMessage.includes('check my fees')) {
        currentContext = 'fees';
        return {
            text: "You can check your fees balance through:\n\n1. Student Portal → Finance Section\n2. SMS 'BAL <REGNO>' to 40440 (Ksh 5 charge)\n3. Visit the Finance Office at Main Campus\n\nFor detailed fee statements, log in to your student portal.",
            context: 'fees'
        };
    }
    if (lowerMessage.includes('results') || lowerMessage.includes('check my results')) {
        currentContext = 'results';
        return {
            text: "You can access your results through:\n\n1. Student Portal → Academics → Exam Results\n2. SMS 'RESULT <REGNO> <SEM>' to 20881 (Ksh 25 per request)\n\nResults are typically released 4 weeks after exams.",
            context: 'results'
        };
    }
    if (lowerMessage.includes('registered units') || lowerMessage.includes('unit registration')) {
        currentContext = 'administration';
        return {
            text: "To check your registered units:\n\n1. Log in to your student portal\n2. Navigate to 'Academics' → 'Course Registration'\n3. Your current semester units will be displayed\n\nFor registration issues, contact your department coordinator.",
            context: 'administration'
        };
    }
    if (lowerMessage.includes('hostels available') || lowerMessage.includes('accommodation options')) {
        currentContext = 'hostels';
        return {
            text: "MKU offers several hostel options:\n\n• Standard Hostels (Ksh 22,000-26,000/semester)\n• Premium Hostels (Ksh 34,000-48,000/semester)\n\nAvailability can be checked on the accommodation portal or by emailing hostels@mku.ac.ke",
            context: 'hostels'
        };
    }
    if (lowerMessage.includes('key contacts') || lowerMessage.includes('important numbers')) {
        currentContext = 'general';
        return {
            text: "Here are key MKU contacts:\n\n• Finance Office: 020-2874000\n• Registrar: 020-2874123\n• Hostels: 0712345678\n• Emergency: 0712345600\n• General Inquiries: info@mku.ac.ke\n\nMore contacts available on the university website.",
            context: 'general'
        };
    }
    if (lowerMessage.includes('how much is university hostels') || lowerMessage.includes('hostel fees')) {
        currentContext = 'hostels';
        return {
            text: "Hostel fees at MKU:\n\n• Standard Rooms:\n  - Triple: Ksh 22,000/semester\n  - Double: Ksh 26,000/semester\n• Premium Rooms:\n  - Double: Ksh 34,000/semester\n  - Single: Ksh 48,000/semester\n\nAdditional charges include Ksh 3,000 refundable deposit.",
            context: 'hostels'
        };
    }
    if (lowerMessage.includes('replace lost student id') || lowerMessage.includes('lost id card')) {
        currentContext = 'administration';
        return {
            text: "To replace a lost student ID:\n\n1. Report to Security Office\n2. Obtain replacement form from Registrar\n3. Pay Ksh 1,000 at Finance Office\n4. Submit form with payment receipt\n\nNew ID will be ready in 3-5 working days.",
            context: 'administration'
        };
    }
    if (lowerMessage.includes('school address') || lowerMessage.includes('university location')) {
        currentContext = 'general';
        return {
            text: "MKU Main Campus Address:\n\nMount Kenya University\nGeneral Kago Road\nThika, Kenya\nP.O Box 342-01000\n\nOther campuses in Nairobi, Mombasa, and regional towns.",
            context: 'general'
        };
    }
    if (lowerMessage.includes('how can you be helpful') || lowerMessage.includes('what can you do')) {
        return {
            text: "I can help with various MKU services including:\n\n• Fees and financial information\n• Hostel bookings and queries\n• Exam results and transcripts\n• Administrative procedures\n• General university information\n\nWhat would you like to know about?",
            context: null
        };
    }
    
    // Back to main menu
    if (lowerMessage.includes('back') || lowerMessage.includes('main menu') || 
        lowerMessage.includes('start over') || lowerMessage.includes('home')) {
        currentContext = null;
        localStorage.removeItem('mkuchatbot_context');
        return {
            text: "Returning to main menu. How else can I help you?",
            context: null
        };
    }

    // Fees context
    if (currentContext === 'fees') {
        // Payment methods
        if (lowerMessage.includes('payment') || lowerMessage.includes('method') || 
            lowerMessage.includes('mpesa') || lowerMessage.includes('bank')) {
            const responses = [
                " Payment Methods Details:\n\n• MPesa: Paybill 404040, Account: Student Registration Number\n  - Transaction limit: Ksh 150,000 per day\n  - Processing time: Instant (portal updates within 2hrs)\n• Bank Deposit: \n  - Equity Bank: Acc No. 0780263456007\n  - KCB: Acc No. 1145889300\n  - Use registration number as reference\n• Online Portal: \n  - Visa/Mastercard (2.9% processing fee)\n  - Mobile Banking: Select 'MKU Fees' option\n\nℹ️ Always get receipt confirmation SMS within 24hrs",
                " Digital Payment Options:\n\n• MPesa: \n  - Paybill: 404040\n  - Account: Student registration number\n  - Daily limit: Ksh 150,000\n• Bank Transfer: \n  - Equity: 0780263456007\n  - KCB: 1145889300\n  - Reference: Registration number\n• Card Payments: \n  - 2.9% processing fee applies\n  - Accepted worldwide\n\nProcessing time: 1-2 hours during business days",
                " Banking & Payment Procedures:\n\n1. MPesa: \n   - Paybill: 404040\n   - Account: Registration number\n   - Max: Ksh 150,000/day\n2. Bank: \n   - Deposit at Equity or KCB\n   - Account numbers listed on portal\n3. Online: \n   - Secure gateway with Visa/Mastercard\n   - Mobile banking integration\n\nAlways keep transaction ID until payment appears in portal"
            ];
            return {
                text: getRotatedResponse('fees', 'payment', responses),
                context: 'fees',
                subContext: 'payment'
            };
        }
        
        // Deadlines
        if (lowerMessage.includes('deadline') || lowerMessage.includes('due date') || 
            lowerMessage.includes('late')) {
            const responses = [
                " Fee Deadlines & Penalties:\n\n• Semester 1: August 31st\n• Semester 2: January 31st\n• Late Payment Penalties:\n  - 1-7 days late: Ksh 500\n  - 8-14 days late: Ksh 1,000\n  - After 15 days: Course deregistration\n• Installment Plans:\n  - 50% by deadline + 25% monthly (admin fee Ksh 2,000)\n  - Apply at finance.mku.ac.ke/installments\n\n⚠️ Exam access requires 75% fee payment",
                " Fee Payment Schedule:\n\n• Semester 1 Deadline: August 31\n• Semester 2 Deadline: January 31\n• Consequences of Late Payment:\n  - Ksh 500 penalty (1-7 days)\n  - Ksh 1,000 penalty (8-14 days)\n  - Course deregistration after 15 days\n• Installment Options:\n  - Minimum 50% down payment\n  - Balance in monthly installments\n  - Ksh 2,000 administration fee",
                " Important Fee Deadlines:\n\n• Full Payment Due:\n  - Semester 1: August 31\n  - Semester 2: January 31\n• Late Fees:\n  - Week 1: Ksh 500\n  - Week 2: Ksh 1,000\n  - After 2 weeks: Deregistration risk\n• Payment Plans:\n  - Available with 50% initial payment\n  - Monthly installments with Ksh 2,000 fee\n\nNote: 75% payment required for exam access"
            ];
            return {
                text: getRotatedResponse('fees', 'deadlines', responses),
                context: 'fees',
                subContext: 'deadlines'
            };
        }
        
        // Default fees response
        return {
            text: " Comprehensive Fees Information:\n\n• Fee Structure: Varies by program (View at finance.mku.ac.ke/fee-structure)\n• Payment Options: MPesa, Bank, Online, Finance Office\n• Important Contacts:\n  - Finance Office: finance@mku.ac.ke / 020-2874000\n  - HELB Desk: helb@mku.ac.ke\n\nWhat specific fee service do you need?",
            context: 'fees'
        };
    }
    
    // Administration context
    if (currentContext === 'administration') {
        // Registrar
        if (lowerMessage.includes('registrar') || lowerMessage.includes('academic record') || 
            lowerMessage.includes('transcript')) {
            const responses = [
                " Registrar's Office Services:\n\n• Official Transcripts:\n  - Cost: Ksh 1,000 (standard), Ksh 2,000 (express)\n  - Processing: 3 working days\n  - Collection: Thika Main Campus, Admin Block Rm 12\n• Certificate Replacement:\n  - Affidavit required (Ksh 500 stamp duty)\n  - Fee: Ksh 5,000\n  - Processing: 21 working days\n• Course Registration Issues:\n  - Late registration fee: Ksh 500\n  - Deadline: 2 weeks after semester start",
                " Registrar Services:\n\n• Transcript Requests:\n  - Standard: Ksh 1,000 (3 days)\n  - Express: Ksh 2,000 (24 hours)\n  - Pickup: Admin Block Room 12\n• Lost Certificates:\n  - Police report required\n  - Affidavit (Ksh 500)\n  - Replacement fee: Ksh 5,000\n• Registration Problems:\n  - Late fee: Ksh 500\n  - Must be resolved within 14 days",
                " Registrar Procedures:\n\n1. Transcripts:\n   - Apply online or in-person\n   - Fees: Ksh 1,000 regular, Ksh 2,000 rush\n2. Certificate Replacement:\n   - File police report\n   - Obtain sworn affidavit\n   - Pay Ksh 5,000 fee\n3. Registration Issues:\n   - Late registration: Ksh 500 fee\n   - Course changes require department approval"
            ];
            return {
                text: getRotatedResponse('administration', 'registrar', responses),
                context: 'administration',
                subContext: 'registrar'
            };
        }
        
        // Default administration response
        return {
            text: " Administration Services Overview:\n\n1. Registrar's Office: Transcripts, certificates, registration\n2. Dean of Students: Counseling, clubs, disability services\n3. Finance Office: Fees, receipts, sponsorships\n4. Examination Office: Exam cards, special exams\n\nWhich specific service do you require?",
            context: 'administration'
        };
    }
    
    // Hostels context
    if (currentContext === 'hostels') {
        // Application
        if (lowerMessage.includes('application') || lowerMessage.includes('apply') || 
            lowerMessage.includes('book')) {
            const responses = [
                " Hostel Application Process:\n\n• Eligibility:\n  - First years guaranteed\n  - Continuing students: 2.5 GPA minimum\n• Application Steps:\n  1. Portal → Accommodation → Apply\n  2. Pay Ksh 5,000 deposit\n  3. Upload medical certificate\n• Allocation Timeline:\n  - Semester start: 2 weeks prior\n  - Late applications: Rolling basis\n• Required Documents:\n  - Medical cover proof\n  - ID copy\n  - Admission letter",
                " Applying for Accommodation:\n\n• Who Can Apply:\n  - New students automatically\n  - Returning: Minimum 2.5 GPA\n• Process:\n  1. Student portal accommodation section\n  2. Pay Ksh 5,000 deposit\n  3. Submit health documents\n• Timing:\n  - Assignments 2 weeks before semester\n  - Late applications considered\n• Documents:\n  - Health insurance\n  - National ID\n  - Admission letter",
                " Hostel Application Details:\n\nEligibility:\n- First-year students: Guaranteed\n- Continuing: 2.5 GPA required\n\nApplication:\n1. Online portal application\n2. Ksh 5,000 deposit payment\n3. Medical certificate upload\n\nTimeline:\n- Allocations announced 14 days before semester\n- Late applications processed as received\n\nRequired Documents:\n- Medical insurance proof\n- ID document\n- Admission letter"
            ];
            return {
                text: getRotatedResponse('hostels', 'application', responses),
                context: 'hostels',
                subContext: 'application'
            };
        }
        
        // Default hostels response
        return {
            text: " Comprehensive Hostel Information:\n\n• Application Portal: accommodation.mku.ac.ke\n• Contact: hostels@mku.ac.ke / 0712345678\n• Locations:\n  - Main Campus: 5 hostels\n  - Town Campus: 2 hostels\n  - Parklands: 1 hostel\n\nWhat hostel service do you require?",
            context: 'hostels'
        };
    }
    
    // Results context
    if (currentContext === 'results') {
        // Access
        if (lowerMessage.includes('access') || lowerMessage.includes('check') || 
            lowerMessage.includes('view')) {
            const responses = [
                " Accessing Examination Results:\n\n• Portal Access:\n  1. Login to studentportal.mku.ac.ke\n  2. Navigate: Academics → Exam Results\n• SMS Service:\n  - Text 'RESULT <REGNO> <SEM>' to 20881\n  - Cost: Ksh 25 per request\n• Result Release Schedule:\n  - Regular Exams: 4 weeks after exams\n  - Supplementary: 6 weeks\n• Missing Results:\n  - Contact department coordinator\n  - Submit Form RE/02 at exam office",
                " Checking Results:\n\n• Online Portal:\n  - Student portal → Academics → Results\n• SMS Method:\n  - Format: 'RESULT [RegNo] [Semester]'\n  - Send to 20881 (Ksh 25)\n• Release Timeline:\n  - Regular exams: 4 weeks\n  - Supplements: 6 weeks\n• Missing Grades:\n  - Contact department head\n  - Submit Form RE/02",
                " Result Access Methods:\n\n1. Portal:\n   - Login to student portal\n   - Navigate to Academics section\n2. SMS:\n   - Text 'RESULT <REGNO> <SEM>' to 20881\n   - Charge: Ksh 25\n3. Release Schedule:\n   - Main exams: 4 weeks\n   - Supplements: 6 weeks\n4. Missing Results:\n   - Department coordinator\n   - Form RE/02 required"
            ];
            return {
                text: getRotatedResponse('results', 'access', responses),
                context: 'results',
                subContext: 'access'
            };
        }
        
        // Default results response
        return {
            text: " Comprehensive Results Services:\n\n• Transcript Requests: Online/Offline\n• Result Inquiries: Exam Office Rm 15\n• Verification Portal: verify.mku.ac.ke\n• Contact: exams@mku.ac.ke / 020-2874123\n\nWhat result service do you need?",
            context: 'results'
        };
    }
    
    // General context
    if (currentContext === 'general') {
        // Contacts
        if (lowerMessage.includes('contact') || lowerMessage.includes('phone') || 
            lowerMessage.includes('email')) {
            const responses = [
                " Essential University Contacts:\n\n• Emergency Services:\n  - Security: 0712345600\n  - Medical: 0733355555\n• Administration:\n  - Registrar: registrar@mku.ac.ke\n  - Finance: finance@mku.ac.ke\n  - Academics: academics@mku.ac.ke\n• Campus Locations:\n  - Main Campus: Thika\n  - Nairobi Campus: Ronald Ngala St\n  - Mombasa Campus: Mvita\n• Online: www.mku.ac.ke",
                " Important Contacts:\n\n• Emergencies:\n  - Security: 0712345600\n  - Medical: 0733355555\n• Administration:\n  - Registrar: registrar@mku.ac.ke\n  - Finance: finance@mku.ac.ke\n  - Academics: academics@mku.ac.ke\n• Campuses:\n  - Thika (Main)\n  - Nairobi CBD\n  - Mombasa\n• Website: mku.ac.ke",
                " University Contacts:\n\n1. Emergency:\n   - Security: 0712345600\n   - Medical: 0733355555\n2. Administration:\n   - Registrar: registrar@mku.ac.ke\n   - Finance: finance@mku.ac.ke\n   - Academics: academics@mku.ac.ke\n3. Campuses:\n   - Main: Thika\n   - Nairobi: Ronald Ngala\n   - Mombasa: Mvita\n4. Website: www.mku.ac.ke"
            ];
            return {
                text: getRotatedResponse('general', 'contacts', responses),
                context: 'general',
                subContext: 'contacts'
            };
        }
        
        // Default general response
        return {
            text: " General University Information:\n\n• Academic Calendar: calendar.mku.ac.ke\n• Student Portal: studentportal.mku.ac.ke\n• Mobile App: MKU Connect (Play Store/App Store)\n• Important Numbers: 020-2874000\n\nWhich general service do you need information about?",
            context: 'general'
        };
    }
    
    // Main context detection
    if (lowerMessage.includes('fee') || lowerMessage.includes('payment') || 
        lowerMessage.includes('sponsor') || message === "Fees Information") {
        currentContext = 'fees';
        return {
            text: " Fees & Financial Services:\n\n• Tuition Fees: Program-specific (View at finance.mku.ac.ke)\n• Payment Options: MPesa, Bank, Online Portal\n• Sponsorships: HELB, County, Corporate\n• Contacts: finance@mku.ac.ke / 020-2874000\n\nWhat specific fee information do you need?",
            context: 'fees'
        };
    }
    if (message === "Administration" || lowerMessage.includes('admin') || 
        lowerMessage.includes('registrar') || lowerMessage.includes('dean')) {
        currentContext = 'administration';
        return {
            text: " Administrative Services:\n\n• Registrar: Transcripts, certificates\n• Dean of Students: Welfare, counseling\n• Finance Office: Fee management\n• Exams Office: Results, exam cards\n\nWhich administrative department do you need?",
            context: 'administration'
        };
    }
    if (message === "Hostels" || lowerMessage.includes('hostel') || 
        lowerMessage.includes('accommodation') || lowerMessage.includes('dorm')) {
        currentContext = 'hostels';
        return {
            text: " Hostel Accommodation Services:\n\n• Application Process: Online portal\n• Fee Structure: Standard/Premium options\n• Regulations: Visiting hours, curfew\n• Facilities: WiFi, laundry, security\n\nWhat hostel information do you need?",
            context: 'hostels'
        };
    }
    if (message === "Results" || lowerMessage.includes('result') || 
        lowerMessage.includes('transcript') || lowerMessage.includes('exam')) {
        currentContext = 'results';
        return {
            text: " Academic Results Services:\n\n• Accessing Results: Portal/SMS\n• Transcript Requests: Standard/Express\n• Remarking: Process and fees\n• Supp Exams: Registration procedure\n\nWhat result service do you require?",
            context: 'results'
        };
    } 
    if (message === "General Information" || lowerMessage.includes('general') || 
        lowerMessage.includes('info') || lowerMessage.includes('campus')) {
        currentContext = 'general';
        return {
            text: " General University Services:\n\n• Library: Resources and hours\n• Contacts: Essential numbers\n• Events: Calendar and registration\n• Facilities: Labs, sports, health\n\nWhich general service do you need information about?",
            context: 'general'
        };
    }
    
    // Default response
    return {
        text: "I'm here to help with Mount Kenya University services. Please choose an option below:",
        context: null
    };
}

// Get context-specific options
function getContextOptions(context, subContext) {
    switch (context) {
        case 'fees':
            if (subContext === 'payment') {
                return ["Payment confirmation", "Receipt issues", "Bank details", "Back to fees"];
            }
            if (subContext === 'deadlines') {
                return ["Installment plans", "Penalty waiver", "Extension request", "Back to fees"];
            }
            return ["Payment methods", "Deadlines", "Fee balance", "Sponsorships", "Back to main"];
            
        case 'administration':
            if (subContext === 'registrar') {
                return ["Transcript status", "Certificate replacement", "Registration issues", "Back to admin"];
            }
            return ["Registrar", "Dean of Students", "Exams", "Finance", "Back to main"];
            
        case 'hostels':
            if (subContext === 'application') {
                return ["Application status", "Eligibility", "Required documents", "Back to hostels"];
            }
            return ["Application", "Fees", "Rules", "Facilities", "Back to main"];
            
        case 'results':
            if (subContext === 'access') {
                return ["Missing results", "SMS service", "Release schedule", "Back to results"];
            }
            return ["Access results", "Transcripts", "Remarking", "Supp Exams", "Back to main"];
            
        case 'general':
            if (subContext === 'contacts') {
                return ["Emergency numbers", "Department contacts", "Campus locations", "Back to general"];
            }
            return ["Library", "Contacts", "Events", "Facilities", "Back to main"];
            
        default:
            return [
                "Fees Information",
                "Administration",
                "Hostels",
                "Results",
                "General Information"
            ];
    }
}

// Event listeners
chatbotIcon.addEventListener('click', () => {
    chatbotContainer.style.display = 'block';
    chatbotIcon.style.display = 'none';
    initChatbot();
});
chatbotClose.addEventListener('click', () => {
    chatbotContainer.style.display = 'none';
    chatbotIcon.style.display = 'flex';
});
deleteHistoryBtn.addEventListener('click', () => {
    deleteHistory();
});
sendButton.addEventListener('click', handleUserInput);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleUserInput();
    }
});

// Initialize delete button visibility
updateDeleteButtonVisibility();