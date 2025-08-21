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
    const welcomeMessage = "Hello! 👋 I'm the MKU Student Assistant. How can I help you today? You can ask about finance, administrative services, or academics.";
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
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('jambo')) {
        return {
            text: "Hello there! How can I help you today?",
            context: currentContext
        };
    }
    
    if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
        return {
            text: "You're welcome! Was just doing my duty, come back again if you need anything else.",
            context: currentContext
        };
    }
    
    if (message.trim() === '') {
        return {
            text: "Sorry, I didn't understand that.",
            context: currentContext
        };
    }
    
    // Handle all button and subbutton responses
    if (lowerMessage.includes('payment confirmation') || lowerMessage.includes('receipt issues') || 
        lowerMessage.includes('bank details') || lowerMessage.includes('fee balance') || 
        lowerMessage.includes('sponsorships') || lowerMessage.includes('installment plans') || 
        lowerMessage.includes('penalty waiver') || lowerMessage.includes('extension request') ||
        lowerMessage.includes('transcript status') || lowerMessage.includes('certificate replacement') || 
        lowerMessage.includes('registration issues') || lowerMessage.includes('dean of students') || 
        lowerMessage.includes('exams') || lowerMessage.includes('missing results') || 
        lowerMessage.includes('sms service') || lowerMessage.includes('release schedule') || 
        lowerMessage.includes('transcripts') || lowerMessage.includes('remarking') || 
        lowerMessage.includes('supp exams') || lowerMessage.includes('how can i know my fees') || 
        lowerMessage.includes('check my fees') || lowerMessage.includes('results') || 
        lowerMessage.includes('check my results') || lowerMessage.includes('registered units') || 
        lowerMessage.includes('unit registration') || lowerMessage.includes('replace lost student id') || 
        lowerMessage.includes('lost id card') || lowerMessage.includes('how can you be helpful') || 
        lowerMessage.includes('what can you do') || lowerMessage.includes('payment') || 
        lowerMessage.includes('method') || lowerMessage.includes('mpesa') || 
        lowerMessage.includes('bank') || lowerMessage.includes('deadline') || 
        lowerMessage.includes('due date') || lowerMessage.includes('late') || 
        lowerMessage.includes('registrar') || lowerMessage.includes('academic record') || 
        lowerMessage.includes('transcript') || lowerMessage.includes('access') || 
        lowerMessage.includes('check') || lowerMessage.includes('view') || 
        lowerMessage.includes('fee') || lowerMessage.includes('sponsor') || 
        message === "Finance" || message === "Administrative" || message === "Academics" ||
        lowerMessage.includes('admin') || lowerMessage.includes('dean') || 
        lowerMessage.includes('result') || lowerMessage.includes('exam') || 
        lowerMessage.includes('academic')) {
        
        // Finance context
        if (lowerMessage.includes('payment confirmation') || lowerMessage.includes('receipt issues')) {
            return {
                text: "For payment confirmation or receipt issues:\n\n• Check your student portal under 'Finance'\n• Email finance@mku.ac.ke with your registration number\n• Visit Finance Office at Main Campus with transaction details\n• SMS 'RECEIPT <REGNO>' to 40440\n\nReceipts are usually generated within 2 hours of payment.",
                context: 'finance',
                subContext: 'payment'
            };
        }
        
        if (lowerMessage.includes('bank details')) {
            return {
                text: "MKU Bank Account Details:\n\n• Equity Bank: 0780263456007\n• KCB Bank: 1145889300\n• Co-operative Bank: 01129079961300\n\nAlways use your registration number as the reference when making bank payments.",
                context: 'finance',
                subContext: 'payment'
            };
        }
        
        if (lowerMessage.includes('fee balance')) {
            return {
                text: "To check your fee balance:\n\n1. Student Portal → Finance Section → Fee Statement\n2. SMS 'BAL <REGNO>' to 40440 (Ksh 5 charge)\n3. Visit Finance Office at Main Campus\n\nYour balance is updated in real-time as payments are processed.",
                context: 'finance'
            };
        }
        
        if (lowerMessage.includes('sponsorships')) {
            return {
                text: "Sponsorship Information:\n\n• HELB: Apply online at www.helb.co.ke\n• County Bursaries: Contact your county education office\n• Corporate Sponsorships: Check with companies in your field of study\n• MKU Internal Bursaries: Apply through student portal\n\nDeadlines vary, so check regularly for opportunities.",
                context: 'finance'
            };
        }
        
        if (lowerMessage.includes('installment plans')) {
            return {
                text: "Installment Payment Plans:\n\n• Minimum 50% payment required at registration\n• Remaining balance payable in monthly installments\n• Administration fee: Ksh 2,000\n• Apply online at finance.mku.ac.ke/installments\n• Approval within 48 hours\n\nLate installment payments incur a Ksh 500 penalty.",
                context: 'finance',
                subContext: 'deadlines'
            };
        }
        
        if (lowerMessage.includes('penalty waiver')) {
            return {
                text: "Late Payment Penalty Waiver:\n\n• Waivers are considered case-by-case\n• Requires written explanation with supporting documents\n• Submit request to finance@mku.ac.ke\n• Approval takes 3-5 working days\n• Only genuine emergencies are considered\n\nNote: Waivers are rarely granted for routine delays.",
                context: 'finance',
                subContext: 'deadlines'
            };
        }
        
        if (lowerMessage.includes('extension request')) {
            return {
                text: "Fee Payment Extension:\n\n• Maximum 14-day extension possible\n• Requires formal written request\n• Submit to department head for endorsement\n• Then to Finance Office for approval\n• Email: finance@mku.ac.ke\n\nExtensions are only granted in exceptional circumstances.",
                context: 'finance',
                subContext: 'deadlines'
            };
        }
        
        if (lowerMessage.includes('how can i know my fees') || lowerMessage.includes('check my fees')) {
            currentContext = 'finance';
            return {
                text: "You can check your fees balance through:\n\n1. Student Portal → Finance Section\n2. SMS 'BAL <REGNO>' to 40440 (Ksh 5 charge)\n3. Visit the Finance Office at Main Campus\n\nFor detailed fee statements, log in to your student portal.",
                context: 'finance'
            };
        }
        
        if (lowerMessage.includes('payment') || lowerMessage.includes('method') || 
            lowerMessage.includes('mpesa') || lowerMessage.includes('bank')) {
            const responses = [
                " Payment Methods Details:\n\n• MPesa: Paybill 404040, Account: Student Registration Number\n  - Transaction limit: Ksh 150,000 per day\n  - Processing time: Instant (portal updates within 2hrs)\n• Bank Deposit: \n  - Equity Bank: Acc No. 0780263456007\n  - KCB: Acc No. 1145889300\n  - Use registration number as reference\n• Online Portal: \n  - Visa/Mastercard (2.9% processing fee)\n  - Mobile Banking: Select 'MKU Fees' option\n\nℹ️ Always get receipt confirmation SMS within 24hrs",
                " Digital Payment Options:\n\n• MPesa: \n  - Paybill: 404040\n  - Account: Student registration number\n  - Daily limit: Ksh 150,000\n• Bank Transfer: \n  - Equity: 0780263456007\n  - KCB: 1145889300\n  - Reference: Registration number\n• Card Payments: \n  - 2.9% processing fee applies\n  - Accepted worldwide\n\nProcessing time: 1-2 hours during business days",
                " Banking & Payment Procedures:\n\n1. MPesa: \n   - Paybill: 404040\n   - Account: Registration number\n   - Max: Ksh 150,000/day\n2. Bank: \n   - Deposit at Equity or KCB\n   - Account numbers listed on portal\n3. Online: \n   - Secure gateway with Visa/Mastercard\n   - Mobile banking integration\n\nAlways keep transaction ID until payment appears in portal"
            ];
            return {
                text: getRotatedResponse('finance', 'payment', responses),
                context: 'finance',
                subContext: 'payment'
            };
        }
        
        if (lowerMessage.includes('deadline') || lowerMessage.includes('due date') || 
            lowerMessage.includes('late')) {
            const responses = [
                " Fee Deadlines & Penalties:\n\n• Semester 1: August 31st\n• Semester 2: January 31st\n• Late Payment Penalties:\n  - 1-7 days late: Ksh 500\n  - 8-14 days late: Ksh 1,000\n  - After 15 days: Course deregistration\n• Installment Plans:\n  - 50% by deadline + 25% monthly (admin fee Ksh 2,000)\n  - Apply at finance.mku.ac.ke/installments\n\n⚠️ Exam access requires 75% fee payment",
                " Fee Payment Schedule:\n\n• Semester 1 Deadline: August 31\n• Semester 2 Deadline: January 31\n• Consequences of Late Payment:\n  - Ksh 500 penalty (1-7 days)\n  - Ksh 1,000 penalty (8-14 days)\n  - Course deregistration after 15 days\n• Installment Options:\n  - Minimum 50% down payment\n  - Balance in monthly installments\n  - Ksh 2,000 administration fee",
                " Important Fee Deadlines:\n\n• Full Payment Due:\n  - Semester 1: August 31\n  - Semester 2: January 31\n• Late Fees:\n  - Week 1: Ksh 500\n  - Week 2: Ksh 1,000\n  - After 2 weeks: Deregistration risk\n• Payment Plans:\n  - Available with 50% initial payment\n  - Monthly installments with Ksh 2,000 fee\n\nNote: 75% payment required for exam access"
            ];
            return {
                text: getRotatedResponse('finance', 'deadlines', responses),
                context: 'finance',
                subContext: 'deadlines'
            };
        }
        
        // Administrative context
        if (lowerMessage.includes('transcript status')) {
            return {
                text: "Transcript Application Status:\n\n• Standard processing: 3 working days\n• Express processing: 24 hours\n• Check status at registrar.mku.ac.ke/track\n• Email: registrar@mku.ac.ke with your application reference\n• Phone: 020-2874000 (Registrar's Office)\n\nYou'll receive an SMS when your transcript is ready for collection.",
                context: 'administrative',
                subContext: 'registrar'
            };
        }
        
        if (lowerMessage.includes('certificate replacement')) {
            return {
                text: "Certificate Replacement Process:\n\n1. Obtain police abstract (lost certificate report)\n2. Get sworn affidavit from court (Ksh 500)\n3. Write formal application letter to Registrar\n4. Pay Ksh 5,000 replacement fee\n5. Submit all documents to Registrar's Office\n\nProcessing time: 21 working days after submission.",
                context: 'administrative',
                subContext: 'registrar'
            };
        }
        
        if (lowerMessage.includes('registration issues')) {
            return {
                text: "Registration Issues Assistance:\n\n• Late registration: Ksh 500 penalty fee\n• Course conflicts: Contact your department coordinator\n• System errors: Email portal@mku.ac.ke with screenshot\n• In-person help: ICT Office, Main Campus\n\nRegistration issues must be resolved within 14 days of semester start.",
                context: 'administrative',
                subContext: 'registrar'
            };
        }
        
        if (lowerMessage.includes('dean of students')) {
            return {
                text: "Dean of Students Office:\n\n• Services: Counseling, accommodation, clubs, sports\n• Location: Main Campus, Student Centre Building\n• Email: deanofstudents@mku.ac.ke\n• Phone: 020-2874123\n• Hours: 8:00 AM - 5:00 PM (Weekdays)\n\nHandles student welfare, discipline, and extracurricular activities.",
                context: 'administrative'
            };
        }
        
        if (lowerMessage.includes('exams')) {
            return {
                text: "Examination Office Services:\n\n• Exam cards issuance\n• Special exam arrangements\n• Result inquiries\n• Exam timetable distribution\n• Location: Main Campus, Admin Block Room 15\n• Email: exams@mku.ac.ke\n\nExam cards are available 2 weeks before exams start.",
                context: 'administrative'
            };
        }
        
        if (lowerMessage.includes('registered units') || lowerMessage.includes('unit registration')) {
            currentContext = 'administrative';
            return {
                text: "To check your registered units:\n\n1. Log in to your student portal\n2. Navigate to 'Academics' → 'Course Registration'\n3. Your current semester units will be displayed\n\nFor registration issues, contact your department coordinator.",
                context: 'administrative'
            };
        }
        
        if (lowerMessage.includes('replace lost student id') || lowerMessage.includes('lost id card')) {
            currentContext = 'administrative';
            return {
                text: "To replace a lost student ID:\n\n1. Report to Security Office\n2. Obtain replacement form from Registrar\n3. Pay Ksh 1,000 at Finance Office\n4. Submit form with payment receipt\n\nNew ID will be ready in 3-5 working days.",
                context: 'administrative'
            };
        }
        
        if (lowerMessage.includes('registrar') || lowerMessage.includes('academic record') || 
            lowerMessage.includes('transcript')) {
            const responses = [
                " Registrar's Office Services:\n\n• Official Transcripts:\n  - Cost: Ksh 1,000 (standard), Ksh 2,000 (express)\n  - Processing: 3 working days\n  - Collection: Thika Main Campus, Admin Block Rm 12\n• Certificate Replacement:\n  - Affidavit required (Ksh 500 stamp duty)\n  - Fee: Ksh 5,000\n  - Processing: 21 working days\n• Course Registration Issues:\n  - Late registration fee: Ksh 500\n  - Deadline: 2 weeks after semester start",
                " Registrar Services:\n\n• Transcript Requests:\n  - Standard: Ksh 1,000 (3 days)\n  - Express: Ksh 2,000 (24 hours)\n  - Pickup: Admin Block Room 12\n• Lost Certificates:\n  - Police report required\n  - Affidavit (Ksh 500)\n  - Replacement fee: Ksh 5,000\n• Registration Problems:\n  - Late fee: Ksh 500\n  - Must be resolved within 14 days",
                " Registrar Procedures:\n\n1. Transcripts:\n   - Apply online or in-person\n   - Fees: Ksh 1,000 regular, Ksh 2,000 rush\n2. Certificate Replacement:\n   - File police report\n   - Obtain sworn affidavit\n   - Pay Ksh 5,000 fee\n3. Registration Issues:\n   - Late registration: Ksh 500 fee\n   - Course changes require department approval"
            ];
            return {
                text: getRotatedResponse('administrative', 'registrar', responses),
                context: 'administrative',
                subContext: 'registrar'
            };
        }
        
        // Academics context
        if (lowerMessage.includes('missing results')) {
            return {
                text: "Missing Examination Results:\n\n• Report to your department coordinator immediately\n• Submit Form RE/02 (Available at Exam Office)\n• Provide details: Course code, semester, exam date\n• Processing time: 7-14 working days\n• Email: exams@mku.ac.ke with your details\n\nMissing results are usually resolved within 2 weeks of reporting.",
                context: 'academics',
                subContext: 'access'
            };
        }
        
        if (lowerMessage.includes('sms service')) {
            return {
                text: "SMS Results Service:\n\n• Format: 'RESULT <REGNO> <SEMESTER>'\n• Send to: 20881\n• Cost: Ksh 25 per request\n• Example: 'RESULT S123-4567-2019 1'\n• Semester codes: 1 (Jan-Jun), 2 (Jul-Dec)\n\nResults are available via SMS 48 hours after official release.",
                context: 'academics',
                subContext: 'access'
            };
        }
        
        if (lowerMessage.includes('release schedule')) {
            return {
                text: "Examination Results Release Schedule:\n\n• Regular Exams: 4 weeks after exam period ends\n• Supplementary Exams: 6 weeks after exam period\n• Special Exams: 8 weeks after exam period\n• Project/Thesis: 12 weeks after submission\n\nResults are released on Fridays at 2:00 PM typically.",
                context: 'academics',
                subContext: 'access'
            };
        }
        
        if (lowerMessage.includes('transcripts')) {
            return {
                text: "Academic Transcripts:\n\n• Standard Service: Ksh 1,000 (3 working days)\n• Express Service: Ksh 2,000 (24 hours)\n• Online Application: registrar.mku.ac.ke/transcripts\n• Collection: Registrar's Office, Main Campus\n• Courier: Available at extra cost\n\nTranscripts can be sent directly to institutions upon request.",
                context: 'academics'
            };
        }
        
        if (lowerMessage.includes('remarking')) {
            return {
                text: "Exam Script Remarking:\n\n• Apply within 30 days of result publication\n• Fee: Ksh 1,000 per paper\n• Submit Form RE/01 at Exam Office\n• Processing time: 21 working days\n• Results can go up, down, or remain the same\n\nRemarking is done by a different examiner than the original.",
                context: 'academics'
            };
        }
        
        if (lowerMessage.includes('supp exams')) {
            return {
                text: "Supplementary Examinations:\n\n• Registration: Within 2 weeks of result publication\n• Fee: Ksh 1,000 per paper\n• Apply online: exams.mku.ac.ke/supplementary\n• Exam period: Last week of month following results\n• Maximum: 3 papers per semester\n\nSupplementary exams are for students who scored 30-39% in a course.",
                context: 'academics'
            };
        }
        
        if (lowerMessage.includes('results') || lowerMessage.includes('check my results')) {
            currentContext = 'academics';
            return {
                text: "You can access your results through:\n\n Student Portal → Academics → Exam Results \n\nResults are typically released 4 weeks after exams.",
                context: 'academics'
            };
        }
        
        if (lowerMessage.includes('access') || lowerMessage.includes('check') || 
            lowerMessage.includes('view')) {
            const responses = [
                " Accessing Examination Results:\n\n• Portal Access:\n  1. Login to studentportal.mku.ac.ke\n  2. Navigate: Academics → Exam Results\n• SMS Service:\n  - Text 'RESULT <REGNO> <SEM>' to 20881\n  - Cost: Ksh 25 per request\n• Result Release Schedule:\n  - Regular Exams: 4 weeks after exams\n  - Supplementary: 6 weeks\n• Missing Results:\n  - Contact department coordinator\n  - Submit Form RE/02 at exam office",
                " Checking Results:\n\n• Online Portal:\n  - Student portal → Academics → Results\n• SMS Method:\n  - Format: 'RESULT [RegNo] [Semester]'\n  - Send to 20881 (Ksh 25)\n• Release Timeline:\n  - Regular exams: 4 weeks\n  - Supplements: 6 weeks\n• Missing Grades:\n  - Contact department head\n  - Submit Form RE/02",
                " Result Access Methods:\n\n1. Portal:\n   - Login to student portal\n   - Navigate to Academics section\n2. SMS:\n   - Text 'RESULT <REGNO> <SEM>' to 20881\n   - Charge: Ksh 25\n3. Release Schedule:\n   - Main exams: 4 weeks\n   - Supplements: 6 weeks\n4. Missing Results:\n   - Department coordinator\n   - Form RE/02 required"
            ];
            return {
                text: getRotatedResponse('academics', 'access', responses),
                context: 'academics',
                subContext: 'access'
            };
        }
        
        if (lowerMessage.includes('how can you be helpful') || lowerMessage.includes('what can you do')) {
            return {
                text: "I can help with various MKU services including:\n\n• Finance and financial information\n• Administrative procedures\n• Academics and exam results\n\nWhat would you like to know about?",
                context: null
            };
        }
        
        // Main context detection
        if (lowerMessage.includes('fee') || lowerMessage.includes('payment') || 
            lowerMessage.includes('sponsor') || message === "Finance") {
            currentContext = 'finance';
            return {
                text: " Finance & Financial Services:\n\n• Tuition Fees: Program-specific (View at finance.mku.ac.ke)\n• Payment Options: MPesa, Bank, Online Portal\n• Sponsorships: HELB, County, Corporate\n• Contacts: finance@mku.ac.ke / 020-2874000\n\nWhat specific finance information do you need?",
                context: 'finance'
            };
        }
        if (message === "Administrative" || lowerMessage.includes('admin') || 
            lowerMessage.includes('registrar') || lowerMessage.includes('dean')) {
            currentContext = 'administrative';
            return {
                text: " Administrative Services:\n\n• Registrar: Transcripts, certificates\n• Dean of Students: Welfare, counseling\n• Finance Office: Fee management\n• Exams Office: Results, exam cards\n\nWhich administrative department do you need?",
                context: 'administrative'
            };
        }
        if (message === "Academics" || lowerMessage.includes('result') || 
            lowerMessage.includes('transcript') || lowerMessage.includes('exam') || 
            lowerMessage.includes('academic')) {
            currentContext = 'academics';
            return {
                text: " Academic Services:\n\n• Accessing Results: Portal/SMS\n• Transcript Requests: Standard/Express\n• Remarking: Process and fees\n• Supp Exams: Registration procedure\n\nWhat academic service do you require?",
                context: 'academics'
            };
        }
    }
    
    if (lowerMessage.includes('back') || lowerMessage.includes('main menu') || 
        lowerMessage.includes('start over') || lowerMessage.includes('home')) {
        currentContext = null;
        localStorage.removeItem('mkuchatbot_context');
        return {
            text: "Returning to main menu. How else can I help you?",
            context: null
        };
    }
    
    return {
        text: "I'm here to help with Mount Kenya University services. Please choose an option below:",
        context: null
    };
}

// Get context-specific options
function getContextOptions(context, subContext) {
    switch (context) {
        case 'finance':
            if (subContext === 'payment') {
                return ["Payment confirmation", "Receipt issues", "Bank details", "Back to finance"];
            }
            if (subContext === 'deadlines') {
                return ["Installment plans", "Penalty waiver", "Extension request", "Back to finance"];
            }
            return ["Payment methods", "Deadlines", "Fee balance", "Sponsorships", "Back to main"];
            
        case 'administrative':
            if (subContext === 'registrar') {
                return ["Transcript status", "Certificate replacement", "Registration issues", "Back to admin"];
            }
            return ["Registrar", "Dean of Students", "Exams", "Finance", "Back to main"];
            
        case 'academics':
            if (subContext === 'access') {
                return ["Missing results", "SMS service", "Release schedule", "Back to academics"];
            }
            return ["Access results", "Transcripts", "Remarking", "Supp Exams", "Back to main"];
            
        default:
            return [
                "Finance",
                "Administrative",
                "Academics"
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