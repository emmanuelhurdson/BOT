
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
        if (message === '') return;
        
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

        // Thank you response
        if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
            return {
                text: "You're welcome! 😊 Is there anything else I can help you with?",
                context: currentContext
            };
        }

        // Fees
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
            
            // Balances
            if (lowerMessage.includes('balance') || lowerMessage.includes('outstanding') || 
                lowerMessage.includes('statement')) {
                const responses = [
                    " Fee Balance Management:\n\n• Check Balance:\n  1. Portal → Finance → Fee Statement\n  2. SMS 'BAL <REGNO>' to 40440 (Ksh 5 charge)\n• Discrepancy Resolution:\n  - Submit payment evidence to finance@mku.ac.ke\n  - Visit Finance Office (Mon-Fri 8am-3pm)\n• Scholarship Deductions:\n  - Reflect 48hrs after award letter submission\n• Refunds: \n  - 30-day processing (requires VC approval)\n  - Ksh 500 processing fee",
                    " Managing Fee Balances:\n\n• View Balance:\n  - Online portal: Finance section\n  - SMS service: 'BAL [REGNO]' to 40440 (Ksh 5)\n• Dispute Resolution:\n  - Email evidence to finance@mku.ac.ke\n  - Office visit with payment proof\n• Scholarships:\n  - Processed within 2 business days\n• Refunds:\n  - 30-day processing period\n  - Ksh 500 administrative fee",
                    " Fee Balance Information:\n\n1. Checking Balance:\n   - Portal: Login → Finance → Statement\n   - SMS: Text 'BAL [RegNo]' to 40440\n2. Discrepancies:\n   - Submit proof to finance office\n   - Office hours: 8am-3pm weekdays\n3. Scholarships:\n   - Applied 48 hours after approval\n4. Refunds:\n   - Require Vice Chancellor approval\n   - Ksh 500 processing charge"
                ];
                return {
                    text: getRotatedResponse('fees', 'balance', responses),
                    context: 'fees',
                    subContext: 'balance'
                };
            }
            
            // Sponsorships
            if (lowerMessage.includes('sponsor') || lowerMessage.includes('helb') || 
                lowerMessage.includes('loan')) {
                const responses = [
                    " Sponsorship Information:\n\n• HELB Applications:\n  - Submit through www.helb.co.ke\n  - MKU code: 10500\n  - Disbursement: 6-8 weeks after approval\n• County Bursaries:\n  - Submit approval letters to County Bursary Office\n  - Processing: 2 weeks\n• Corporate Sponsorships:\n  - Requires letter on company letterhead\n  - 15% discount on tuition\n\nTrack status at portal.mku.ac.ke/sponsorship",
                    " Financial Sponsorship Details:\n\n• HELB:\n  - Apply at HELB portal\n  - Institution code: 10500\n  - Funds released in 6-8 weeks\n• County Bursaries:\n  - Present award letter to bursary office\n  - Processed within 14 days\n• Corporate Sponsors:\n  - Official company letter required\n  - 15% tuition discount\n\nStatus tracking: studentportal.mku.ac.ke/sponsorship",
                    " Sponsorship Programs:\n\n1. HELB Loans:\n   - Application: helb.co.ke\n   - MKU Code: 10500\n   - Disbursement: 1.5-2 months\n2. County Bursaries:\n   - Submit approval to County Office\n   - Processing: 2 weeks\n3. Corporate:\n   - Company letterhead required\n   - 15% discount on tuition fees\n\nCheck status on student portal"
                ];
                return {
                    text: getRotatedResponse('fees', 'sponsorship', responses),
                    context: 'fees',
                    subContext: 'sponsorship'
                };
            }
            
            // Default fees response
            return {
                text: " Comprehensive Fees Information:\n\n• Fee Structure: Varies by program (View at finance.mku.ac.ke/fee-structure)\n• Payment Options: MPesa, Bank, Online, Finance Office\n• Important Contacts:\n  - Finance Office: finance@mku.ac.ke / 020-2874000\n  - HELB Desk: helb@mku.ac.ke\n\nWhat specific fee service do you need?",
                context: 'fees'
            };
        }
        
        // ================= ADMINISTRATION CONTEXT =================
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
            
            // Dean of Students
            if (lowerMessage.includes('dean') || lowerMessage.includes('welfare') || 
                lowerMessage.includes('counsel')) {
                const responses = [
                    " Dean of Students Department:\n\n• Counseling Services:\n  - Bookings: wellness.mku.ac.ke\n  - Crisis Line: 0800720500 (24/7)\n• Clubs & Societies:\n  - Registration fee: Ksh 500 per semester\n  - Funding: Up to Ksh 50,000 per event\n• Disability Services:\n  - Special exam arrangements\n  - Assistive technology available\n• Hostel Complaints:\n  - Submit via studentportal.mku.ac.ke/complaints",
                    " Student Welfare Services:\n\n1. Counseling:\n   - Online booking system\n   - Emergency hotline: 0800720500\n2. Student Organizations:\n   - Registration: Ksh 500/semester\n   - Event funding available\n3. Disability Support:\n   - Exam accommodations\n   - Special equipment\n4. Complaints:\n   - Hostel issues via online portal",
                    " Dean's Office Services:\n\n• Mental Health Support:\n  - Free counseling sessions\n  - 24/7 crisis support\n• Clubs & Activities:\n  - Annual registration fee\n  - Funding for events\n• Accessibility Services:\n  - Special exam arrangements\n  - Assistive devices\n• Complaint Resolution:\n  - Online submission portal"
                ];
                return {
                    text: getRotatedResponse('administration', 'dean', responses),
                    context: 'administration',
                    subContext: 'dean'
                };
            }
            
            // Examination Office
            if (lowerMessage.includes('exam') || lowerMessage.includes('examination') || 
                lowerMessage.includes('card')) {
                const responses = [
                    " Examination Office Procedures:\n\n• Exam Card Requirements:\n  - Printed from portal\n  - 75% course attendance\n  - Valid student ID\n• Special Exams:\n  - Medical cases: Submit within 72hrs\n  - Fee: Ksh 1,000 per paper\n• Result Inquiries:\n  - Form RE/01 at exam office\n  - Processing: 14 days\n\nOffice Hours: 8:30am-4pm (Mon-Fri)",
                    " Exam Services:\n\n• Exam Cards:\n  - Portal printout required\n  - 75% attendance mandatory\n  - Valid ID needed\n• Special Examinations:\n  - Medical documentation required\n  - Fee: Ksh 1,000/paper\n• Result Issues:\n  - Submit Form RE/01\n  - 2-week processing\n\nOffice open weekdays 8:30am-4pm",
                    " Examination Procedures:\n\n1. Exam Cards:\n   - Print from student portal\n   - Require 75% attendance\n   - Must present student ID\n2. Special Exams:\n   - Submit within 3 days of medical issue\n   - Ksh 1,000 per paper fee\n3. Result Queries:\n   - Form RE/01 required\n   - Processing time: 14 days"
                ];
                return {
                    text: getRotatedResponse('administration', 'exam', responses),
                    context: 'administration',
                    subContext: 'exam'
                };
            }
            
            // Finance Office
            if (lowerMessage.includes('finance') || lowerMessage.includes('bursar') || 
                lowerMessage.includes('receipt')) {
                const responses = [
                    " Finance Office Services:\n\n• Fee Receipts:\n  - Instant via portal\n  - Hard copies: Finance Block Rm 7\n• Payment Plans:\n  - Minimum 50% downpayment\n  - Admin fee: 5% of balance\n• Sponsorship Coordination:\n  - HELB/County updates\n  - Corporate billing\n\nEFT Payments:\nBank: Equity Bank\nAcc: 0780263456007\nSwift: EQBLKENA",
                    " Financial Services:\n\n• Receipts:\n  - Digital copies on portal\n  - Paper copies: Finance Office\n• Installment Plans:\n  - 50% minimum payment\n  - 5% administration fee\n• Sponsorship Management:\n  - HELB disbursements\n  - County bursary processing\n\nBank Transfers:\nEquity Bank\nAccount: 0780263456007\nSwift: EQBLKENA",
                    " Finance Department:\n\n1. Receipts:\n   - Instant digital copies\n   - Hard copies at Finance Block\n2. Payment Plans:\n   - 50% initial payment\n   - 5% admin fee on balance\n3. Sponsorships:\n   - HELB coordination\n   - Corporate billing\n\nBank Details:\nEquity Bank\nAcc: 0780263456007"
                ];
                return {
                    text: getRotatedResponse('administration', 'finance', responses),
                    context: 'administration',
                    subContext: 'finance'
                };
            }
            
            // Default administration response
            return {
                text: " Administration Services Overview:\n\n1. Registrar's Office: Transcripts, certificates, registration\n2. Dean of Students: Counseling, clubs, disability services\n3. Finance Office: Fees, receipts, sponsorships\n4. Examination Office: Exam cards, special exams\n\nWhich specific service do you require?",
                context: 'administration'
            };
        }
        
        // ================= HOSTELS CONTEXT =================
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
            
            // Fees
            if (lowerMessage.includes('fee') || lowerMessage.includes('cost') || 
                lowerMessage.includes('charge')) {
                const responses = [
                    " Hostel Fee Structure:\n\n• Standard Hostels:\n  - Double room: Ksh 26,000/semester\n  - Triple room: Ksh 22,000/semester\n• Premium Hostels (AC):\n  - Single: Ksh 48,000\n  - Double: Ksh 34,000\n• Additional Charges:\n  - Caution fee: Ksh 3,000 (refundable)\n  - Cleaning fee: Ksh 1,500\n• Payment Deadline: \n  - 7 days after allocation\n\n⚠️ Non-refundable after moving in",
                    " Accommodation Costs:\n\n• Standard Rooms:\n  - Shared (3-person): Ksh 22,000\n  - Shared (2-person): Ksh 26,000\n• Premium Rooms:\n  - Single occupancy: Ksh 48,000\n  - Double occupancy: Ksh 34,000\n• Extra Fees:\n  - Refundable deposit: Ksh 3,000\n  - Cleaning: Ksh 1,500/semester\n• Payment Due:\n  - Within 7 days of assignment\n\nNote: Fees non-refundable after occupancy",
                    " Hostel Pricing:\n\n1. Standard Options:\n   - Triple: Ksh 22,000\n   - Double: Ksh 26,000\n2. Premium Options:\n   - Single: Ksh 48,000\n   - Double: Ksh 34,000\n3. Additional Costs:\n   - Deposit: Ksh 3,000 (refundable)\n   - Cleaning: Ksh 1,500\n4. Payment Deadline:\n   - 7 days after room assignment"
                ];
                return {
                    text: getRotatedResponse('hostels', 'fees', responses),
                    context: 'hostels',
                    subContext: 'fees'
                };
            }
            
            // Rules
            if (lowerMessage.includes('rule') || lowerMessage.includes('regulation') || 
                lowerMessage.includes('policy')) {
                const responses = [
                    " Hostel Regulations:\n\n• Visiting Hours:\n  - Weekdays: 4pm-7pm\n  - Weekends: 10am-8pm\n• Curfew:\n  - Sun-Thu: 10pm\n  - Fri-Sat: Midnight\n• Prohibited Items:\n  - Cooking appliances\n  - Pets\n  - Alcohol\n• Violation Penalties:\n  - 1st offense: Warning\n  - 2nd offense: Ksh 2,000 fine\n  - 3rd offense: Eviction",
                    " Accommodation Rules:\n\n• Guest Hours:\n  - Mon-Fri: 4pm-7pm\n  - Sat-Sun: 10am-8pm\n• Curfew Times:\n  - Sunday-Thursday: 10pm\n  - Friday-Saturday: Midnight\n• Banned Items:\n  - Electrical cooking devices\n  - Animals\n  - Alcohol\n• Penalties:\n  - First violation: Warning\n  - Second: Ksh 2,000 fine\n  - Third: Eviction from hostel",
                    " Hostel Policies:\n\n1. Visitor Hours:\n   - Weekdays: 4-7 PM\n   - Weekends: 10 AM-8 PM\n2. Curfew:\n   - Sun-Thu: 10 PM\n   - Fri-Sat: 12 AM\n3. Prohibited:\n   - Cooking equipment\n   - Pets\n   - Alcoholic beverages\n4. Consequences:\n   - Warning (first)\n   - Ksh 2,000 fine (second)\n   - Eviction (third offense)"
                ];
                return {
                    text: getRotatedResponse('hostels', 'rules', responses),
                    context: 'hostels',
                    subContext: 'rules'
                };
            }
            
            // Facilities
            if (lowerMessage.includes('facilit') || lowerMessage.includes('amenit') || 
                lowerMessage.includes('room')) {
                const responses = [
                    " Hostel Facilities:\n\n• Standard Amenities:\n  - Study rooms (open 24/7)\n  - Laundry (Ksh 200 per load)\n  - WiFi (5GB free/month)\n• Premium Features:\n  - Ensuite bathrooms\n  - Study desks\n  - 24hr hot water\n• Security:\n  - Biometric access\n  - Guards patrols\n  - CCTV coverage\n• Maintenance:\n  - Report issues via MKU Hostel App\n  - Response time: 24hrs",
                    " Hostel Amenities:\n\n• Basic Facilities:\n  - 24-hour study areas\n  - Laundry services (Ksh 200/load)\n  - Free WiFi (5GB monthly)\n• Premium Features:\n  - Private bathrooms\n  - Dedicated study spaces\n  - Constant hot water\n• Security Measures:\n  - Fingerprint access\n  - Regular security patrols\n  - Surveillance cameras\n• Maintenance:\n  - Report via mobile app\n  - 24-hour response target",
                    " Accommodation Features:\n\n1. Standard:\n   - Study rooms open 24/7\n   - Laundry: Ksh 200 per load\n   - WiFi: 5GB free monthly\n2. Premium:\n   - Private bathrooms\n   - Study desks\n   - 24-hour hot water\n3. Security:\n   - Biometric entry\n   - Guard patrols\n   - CCTV systems\n4. Maintenance:\n   - App-based reporting\n   - 24-hour response time"
                ];
                return {
                    text: getRotatedResponse('hostels', 'facilities', responses),
                    context: 'hostels',
                    subContext: 'facilities'
                };
            }
            
            // Default hostels response
            return {
                text: " Comprehensive Hostel Information:\n\n• Application Portal: accommodation.mku.ac.ke\n• Contact: hostels@mku.ac.ke / 0712345678\n• Locations:\n  - Main Campus: 5 hostels\n  - Town Campus: 2 hostels\n  - Parklands: 1 hostel\n\nWhat hostel service do you require?",
                context: 'hostels'
            };
        }
        
        // Results
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
            
            // Transcripts
            if (lowerMessage.includes('transcript') || lowerMessage.includes('certificate') || 
                lowerMessage.includes('academic')) {
                const responses = [
                    " Transcript Services:\n\n• Ordering Process:\n  1. Portal: Services → Transcript Request\n  2. Pay Ksh 1,000 (standard) / Ksh 2,000 (express)\n• Delivery Options:\n  - Collection: Registrar's Office\n  - Courier: DHL (Ksh 1,500 additional)\n  - Email: Verified institutions only\n• Processing Time:\n  - Standard: 5 working days\n  - Express: 24 hours\n• Verification:\n  - Employers: verify.mku.ac.ke\n  - PIN: Provided on transcript",
                    " Academic Transcripts:\n\n• Ordering:\n  - Student portal services section\n  - Fees: Ksh 1,000 standard, Ksh 2,000 express\n• Delivery:\n  - Pickup at Registrar's Office\n  - DHL courier (+Ksh 1,500)\n  - Secure email to institutions\n• Processing:\n  - Standard: 5 business days\n  - Express: 24 hours\n• Verification:\n  - Online portal: verify.mku.ac.ke\n  - Unique PIN provided",
                    " Transcript Procedures:\n\n1. Request Process:\n   - Portal services section\n   - Pay Ksh 1,000 (standard) or Ksh 2,000 (express)\n2. Delivery Methods:\n   - Registrar's Office pickup\n   - DHL courier (extra Ksh 1,500)\n   - Secure email (institutions only)\n3. Processing Times:\n   - Standard: 5 days\n   - Express: 24 hours\n4. Verification:\n   - verify.mku.ac.ke\n   - Transcript includes PIN"
                ];
                return {
                    text: getRotatedResponse('results', 'transcript', responses),
                    context: 'results',
                    subContext: 'transcript'
                };
            }
            
            // Remarking
            if (lowerMessage.includes('remark') || lowerMessage.includes('recheck') || 
                lowerMessage.includes('appeal')) {
                const responses = [
                    " Result Remarking Process:\n\n• Eligibility:\n  - Within 30 days of result release\n  - Fee: Ksh 1,000 per paper\n• Application Steps:\n  1. Obtain Form RE/03 from exam office\n  2. Pay at finance office\n  3. Submit completed form\n• Possible Outcomes:\n  - Grade increase\n  - Grade unchanged\n  - No grade reduction policy\n• Timeline:\n  - 21 working days processing\n\n⚠️ Supplementary scripts not re-marked",
                    " Remarking Procedures:\n\n• Eligibility Period:\n  - 30 days from result release\n  - Fee: Ksh 1,000/paper\n• Application:\n  1. Get Form RE/03\n  2. Pay at finance\n  3. Submit form\n• Outcomes:\n  - Possible grade improvement\n  - No downgrading\n  - Original grade maintained\n• Processing:\n  - 3 weeks\n\nNote: Supp exams not eligible",
                    " Requesting Remarking:\n\n1. Eligibility:\n   - Within 30 days of results\n   - Ksh 1,000 per paper\n2. Process:\n   - Form RE/03 from exams office\n   - Payment at finance\n   - Form submission\n3. Possible Results:\n   - Grade improvement\n   - No change (no downgrade)\n4. Timeline:\n   - 21 working days\n\nNote: Supplementary exams excluded"
                ];
                return {
                    text: getRotatedResponse('results', 'remarking', responses),
                    context: 'results',
                    subContext: 'remarking'
                };
            }
            
            // Supplements
            if (lowerMessage.includes('supplement') || lowerMessage.includes('retake') || 
                lowerMessage.includes('repeat')) {
                const responses = [
                    " Supplementary Examinations:\n\n• Registration:\n  - Portal: Academics → Supp Exams\n  - Deadline: 2 weeks after results\n• Fees:\n  - Ksh 1,500 per unit\n  - Late registration: Ksh 500 penalty\n• Exam Schedule:\n  - Released 3 weeks before exams\n  - Venue: Main campus only\n• Special Considerations:\n  - Medical cases: Submit within 72hrs of missed exam\n  - Form RE/04 required",
                    " Supplementary Exams:\n\n• Registration:\n  - Student portal academics section\n  - Deadline: 14 days after results\n• Fees:\n  - Ksh 1,500 per unit\n  - Late fee: Ksh 500\n• Schedule:\n  - Published 3 weeks prior\n  - Main campus only\n• Special Cases:\n  - Medical issues: Submit within 3 days\n  - Form RE/04 needed",
                    " Retake Examinations:\n\n1. Registration:\n   - Portal: Academics → Supplementary\n   - Deadline: 2 weeks post-results\n2. Fees:\n   - Ksh 1,500 per unit\n   - Late penalty: Ksh 500\n3. Schedule:\n   - Announced 3 weeks before exams\n   - Only at main campus\n4. Special Circumstances:\n   - Medical: Report within 72 hours\n   - Form RE/04 required"
                ];
                return {
                    text: getRotatedResponse('results', 'supplementary', responses),
                    context: 'results',
                    subContext: 'supplementary'
                };
            }
            
            // Default results response
            return {
                text: " Comprehensive Results Services:\n\n• Transcript Requests: Online/Offline\n• Result Inquiries: Exam Office Rm 15\n• Verification Portal: verify.mku.ac.ke\n• Contact: exams@mku.ac.ke / 020-2874123\n\nWhat result service do you need?",
                context: 'results'
            };
        }
        
        // General Context
        if (currentContext === 'general') {
            // Library
            if (lowerMessage.includes('library') || lowerMessage.includes('book') || 
                lowerMessage.includes('research')) {
                const responses = [
                    " Library Services:\n\n• Operating Hours:\n  - Weekdays: 8am-10pm\n  - Saturdays: 9am-4pm\n  - Sundays: Closed\n• Resources:\n  - 250,000+ physical books\n  - 45,000+ e-journals (access via library.mku.ac.ke)\n  - 15,000 thesis collection\n• Borrowing Privileges:\n  - Undergrads: 4 books (14 days)\n  - Postgrads: 6 books (30 days)\n• Special Services:\n  - Turnitin plagiarism checks\n  - Research consultations\n  - Inter-library loans",
                    " Library Information:\n\n• Hours:\n  - Mon-Fri: 8am-10pm\n  - Sat: 9am-4pm\n  - Sun: Closed\n• Collections:\n  - Print books: 250,000+\n  - E-journals: 45,000+\n  - Theses: 15,000+\n• Borrowing:\n  - Undergrads: 4 items for 2 weeks\n  - Postgrads: 6 items for 1 month\n• Services:\n  - Plagiarism checking\n  - Research assistance\n  - Interlibrary loans",
                    " Library Facilities:\n\n1. Opening Hours:\n   - Weekdays: 8 AM - 10 PM\n   - Saturday: 9 AM - 4 PM\n   - Sunday: Closed\n2. Resources:\n   - Books: 250,000+\n   - E-journals: 45,000+\n   - Theses: 15,000+\n3. Borrowing:\n   - Undergraduate: 4 items (14 days)\n   - Postgraduate: 6 items (30 days)\n4. Special Services:\n   - Turnitin checks\n   - Research support\n   - External loans"
                ];
                return {
                    text: getRotatedResponse('general', 'library', responses),
                    context: 'general',
                    subContext: 'library'
                };
            }
            
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
            
            // Events
            if (lowerMessage.includes('event') || lowerMessage.includes('activity') || 
                lowerMessage.includes('fair')) {
                const responses = [
                    " University Events Calendar:\n\n• Annual Events:\n  - Cultural Festival: March 15-19\n  - Career Fair: April 10\n  - Innovation Week: October\n• Student Activities:\n  - Clubs: 45 registered clubs\n  - Sports: Football, basketball, athletics\n  - Trips: Annual wildlife safaris\n• Event Registration:\n  - Portal: events.mku.ac.ke\n  - Deadlines: 1 week before event\n• Attendance Certificates: \n  - 75% participation required",
                    " Campus Events:\n\n• Major Annual Events:\n  - Cultural Fest: March 15-19\n  - Career Expo: April 10\n  - Tech Innovation Week: October\n• Student Activities:\n  - 45+ student clubs\n  - Sports competitions\n  - Educational trips\n• Registration:\n  - events.mku.ac.ke\n  - Deadline: 7 days prior\n• Certification:\n  - Requires 75% attendance",
                    " University Activities:\n\n1. Annual Events:\n   - Cultural Festival: March\n   - Career Fair: April\n   - Innovation Week: October\n2. Student Life:\n   - 45+ clubs\n   - Sports programs\n   - Safari trips\n3. Registration:\n   - Online portal\n   - 1 week before event\n4. Certificates:\n   - Minimum 75% participation"
                ];
                return {
                    text: getRotatedResponse('general', 'events', responses),
                    context: 'general',
                    subContext: 'events'
                };
            }
            
            // Facilities
            if (lowerMessage.includes('facilit') || lowerMessage.includes('campus') || 
                lowerMessage.includes('lab')) {
                const responses = [
                    " Campus Facilities:\n\n• Learning Facilities:\n  - 15 Computer labs\n  - Science labs (Biology, Chemistry, Physics)\n  - 24/7 Study Zones\n• Recreational:\n  - Olympic-size swimming pool\n  - Gym (Ksh 500/month)\n  - Basketball/tennis courts\n• Health Services:\n  - Clinic: 24/7 emergency services\n  - Counseling: Free for students\n• Prayer Rooms:\n  - Christian, Muslim, Hindu spaces\n\nCampus maps: maps.mku.ac.ke",
                    " University Facilities:\n\n• Academic:\n  - 15 computer laboratories\n  - Science labs for all disciplines\n  - 24-hour study areas\n• Recreation:\n  - Olympic swimming pool\n  - Fitness center (Ksh 500/month)\n  - Sports courts\n• Health:\n  - 24/7 medical clinic\n  - Free counseling\n• Religious:\n  - Multi-faith prayer rooms\n\nMaps: maps.mku.ac.ke",
                    " Campus Infrastructure:\n\n1. Learning Spaces:\n   - 15+ computer labs\n   - Specialized science labs\n   - 24/7 study zones\n2. Recreation:\n   - Swimming pool\n   - Gym (Ksh 500/month)\n   - Sports courts\n3. Health Services:\n   - 24-hour clinic\n   - Counseling services\n4. Religious:\n   - Prayer rooms for all faiths\n\nCampus maps: maps.mku.ac.ke"
                ];
                return {
                    text: getRotatedResponse('general', 'facilities', responses),
                    context: 'general',
                    subContext: 'facilities'
                };
            }
            
            // Default general response
            return {
                text: " General University Information:\n\n• Academic Calendar: calendar.mku.ac.ke\n• Student Portal: studentportal.mku.ac.ke\n• Mobile App: MKU Connect (Play Store/App Store)\n• Important Numbers: 020-2874000\n\nWhich general service do you need information about?",
                context: 'general'
            };
        }
        
        // Main context
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
                if (subContext === 'balance') {
                    return ["Balance dispute", "Payment history", "Refund process", "Back to fees"];
                }
                if (subContext === 'sponsorship') {
                    return ["HELB application", "Bursary status", "Corporate sponsorship", "Back to fees"];
                }
                return ["Payment methods", "Deadlines", "Fee balance", "Sponsorships", "Back to main"];
                
            case 'administration':
                if (subContext === 'registrar') {
                    return ["Transcript status", "Certificate replacement", "Registration issues", "Back to admin"];
                }
                if (subContext === 'dean') {
                    return ["Counseling booking", "Club registration", "Disability services", "Back to admin"];
                }
                if (subContext === 'exam') {
                    return ["Exam card issues", "Special exams", "Result inquiries", "Back to admin"];
                }
                if (subContext === 'finance') {
                    return ["Receipt request", "Payment plans", "Sponsorship billing", "Back to admin"];
                }
                return ["Registrar", "Dean of Students", "Exams", "Finance", "Back to main"];
                
            case 'hostels':
                if (subContext === 'application') {
                    return ["Application status", "Eligibility", "Required documents", "Back to hostels"];
                }
                if (subContext === 'fees') {
                    return ["Payment options", "Additional charges", "Refund policy", "Back to hostels"];
                }
                if (subContext === 'rules') {
                    return ["Visiting hours", "Prohibited items", "Complaint procedure", "Back to hostels"];
                }
                if (subContext === 'facilities') {
                    return ["Amenities", "Security", "Maintenance", "Back to hostels"];
                }
                return ["Application", "Fees", "Rules", "Facilities", "Back to main"];
                
            case 'results':
                if (subContext === 'access') {
                    return ["Missing results", "SMS service", "Release schedule", "Back to results"];
                }
                if (subContext === 'transcript') {
                    return ["Order status", "Delivery options", "Verification", "Back to results"];
                }
                if (subContext === 'remarking') {
                    return ["Application process", "Fees", "Timeline", "Back to results"];
                }
                if (subContext === 'supplementary') {
                    return ["Registration", "Fees", "Schedule", "Back to results"];
                }
                return ["Access results", "Transcripts", "Remarking", "Supp Exams", "Back to main"];
                
            case 'general':
                if (subContext === 'library') {
                    return ["E-resources", "Borrowing rules", "Special services", "Back to general"];
                }
                if (subContext === 'contacts') {
                    return ["Emergency numbers", "Department contacts", "Campus locations", "Back to general"];
                }
                if (subContext === 'events') {
                    return ["Annual events", "Student activities", "Registration", "Back to general"];
                }
                if (subContext === 'facilities') {
                    return ["Learning facilities", "Recreational", "Health services", "Back to general"];
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
  