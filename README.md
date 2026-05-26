# 🏹 Arjuna's Astra

A **military-grade secure communications web application** that hides AES-encrypted audio messages inside images using advanced spectrogram steganography via **ARSS (Audio Steganography using Spectrograms)**.

## 📋 Overview

Arjuna's Astra is a sophisticated security-first communication platform designed for confidential audio message transmission. It leverages cutting-edge steganography techniques to embed encrypted audio directly into image files, making communications virtually undetectable while maintaining military-grade encryption standards.

### Key Concept
- **Steganography**: Hide audio messages inside image files
- **Encryption**: AES (Advanced Encryption Standard) encryption layer
- **Spectrogram Analysis**: Advanced ARSS technique for secure audio embedding
- **Web-Based**: Accessible and user-friendly interface

## ✨ Features

- 🔐 **AES Encryption**: Military-grade encryption for audio messages
- 🖼️ **Image Steganography**: Embed encrypted audio into images
- 🔊 **Advanced Spectrogram Technology**: ARSS-based audio hiding
- 🌐 **Full-Stack Web Application**: TypeScript/JavaScript frontend with Python backend
- 🛡️ **Security-First Design**: Built with confidentiality in mind
- 💻 **Cross-Platform**: Works on Windows, macOS, and Linux

## 🏗️ Architecture

The project follows a modern full-stack architecture:

```
Arjuna-s-Astra/
├── frontend/                  # React/TypeScript UI
├── backend/                   # Python backend for steganography & encryption
├── START_ARJUNAS_ARROW.bat    # Windows startup script
├── .gitattributes
├── .gitignore
└── README.md
```

### Technology Stack

| Layer | Technologies | Percentage |
|-------|--------------|-----------|
| **TypeScript** | Frontend Application Logic | 42.3% |
| **JavaScript** | Frontend & Runtime | 24.9% |
| **Python** | Backend Processing | 20.6% |
| **CSS** | Styling | 12.2% |

**Primary Language**: TypeScript

## 🚀 Quick Start

### Prerequisites
- **Node.js** 16+ (for frontend)
- **Python** 3.8+ (for backend)
- **npm** or **yarn** (for package management)

### Installation

#### Option 1: Automated Setup (Windows)
```bash
START_ARJUNAS_ARROW.bat
```

#### Option 2: Manual Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/adilsr-sec/Arjuna-s-Astra.git
   cd Arjuna-s-Astra
   ```

2. **Setup Backend (Python)**
   ```bash
   cd backend
   python -m venv venv
   
   # On Windows:
   venv\Scripts\activate
   
   # On macOS/Linux:
   source venv/bin/activate
   
   pip install -r requirements.txt
   python app.py
   ```

3. **Setup Frontend (Node.js) - in a new terminal**
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Access the application**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:5000` (or configured port)

## 📖 How It Works

### Encoding Process (Hide Audio in Image)

```
Audio Message
    ↓
[AES-256 Encryption] → Encrypted Audio
    ↓
[Spectrogram Conversion] → Frequency Data
    ↓
[ARSS Embedding] → Modified Image
    ↓
Output: Image with Hidden Encrypted Audio
```

**Steps:**
1. Select an audio message to encrypt
2. Choose an image as the carrier file
3. Audio is encrypted using AES encryption with your key
4. Encrypted audio is converted to a spectrogram representation
5. Spectrogram data is embedded into the image using ARSS technique
6. Output: Image file containing hidden encrypted audio (visually identical to original)

### Decoding Process (Extract Audio from Image)

```
Image with Hidden Audio
    ↓
[ARSS Extraction] → Spectrogram Data
    ↓
[Audio Reconstruction] → Encrypted Audio
    ↓
[AES-256 Decryption] → Original Audio Message
    ↓
Output: Original Audio Message
```

**Steps:**
1. Select the image containing hidden audio
2. Extract spectrogram data from image using ARSS
3. Convert spectrogram back to audio format
4. Decrypt audio using your AES encryption key
5. Output: Original audio message revealed

## 🔒 Security Considerations

### Encryption
- **Algorithm**: AES-256 (Advanced Encryption Standard)
- **Mode**: Configurable (typically CBC or GCM)
- **Key Derivation**: PBKDF2 or similar key stretching

### Steganography Security
- **Invisibility**: Audio information is not stored in standard file metadata
- **Robustness**: Embedded data survives image compression and basic transformations
- **Undetectability**: No obvious indicators of hidden data
- **Capacity**: Hidden audio size depends on carrier image dimensions

### Best Practices
- ✅ Use strong, unique encryption keys
- ✅ Implement secure key storage mechanisms
- ✅ Never reuse keys across different messages
- ✅ Validate image integrity before decoding
- ✅ Sanitize user inputs and uploaded files
- ✅ Use HTTPS for all data transmission
- ✅ Implement rate limiting and access controls
- ⚠️ Be aware of local laws regarding cryptography

## 💡 Use Cases

- 🎖️ **Military Communications**: Secure defense and intelligence operations
- 🏢 **Corporate Confidentiality**: Executive and sensitive business communications
- 🏛️ **Government Operations**: Inter-agency secure messaging
- 🔬 **Research**: Audio steganography and cryptography studies
- 👥 **Privacy Protection**: Individuals concerned with privacy and surveillance
- 📊 **Data Protection**: Confidential information transmission

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/        # React components
│   ├── pages/             # Page components
│   ├── services/          # API services
│   ├── utils/             # Utility functions
│   ├── styles/            # CSS/Styling
│   └── index.tsx
├── public/                # Static assets
├── package.json
├── tsconfig.json
└── README.md

backend/
├── app.py                 # Main Flask/FastAPI application
├── routes/                # API endpoints
├── services/              # Business logic (ARSS, encryption)
├── utils/                 # Utility functions
├── requirements.txt       # Python dependencies
└── README.md
```

## 🛠️ Development

### Frontend Development
```bash
cd frontend

# Install dependencies
npm install

# Development server (with hot reload)
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Run linter
npm run lint
```

### Backend Development
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run development server
python app.py

# Run with Flask debug mode
FLASK_ENV=development python app.py

# Run tests
pytest
```

### Environment Variables

Create `.env` files in both frontend and backend directories:

**backend/.env**
```
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key-here
AES_ALGORITHM=AES-256
```

**frontend/.env**
```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_DEBUG=true
```

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/Arjuna-s-Astra.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```

4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```

5. **Open a Pull Request**

### Code Standards
- Write clean, readable code
- Follow project coding conventions
- Add comments for complex logic
- Ensure security best practices
- Write tests for new features
- Update documentation accordingly

## 📝 License

This project is open-source. Please refer to the LICENSE file in the repository for complete licensing information.

## 📞 Support & Issues

For issues, questions, or suggestions:
- 🐛 Report bugs via [Issues](https://github.com/adilsr-sec/Arjuna-s-Astra/issues)
- 💬 Start [Discussions](https://github.com/adilsr-sec/Arjuna-s-Astra/discussions)
- 📖 Check the [Wiki](https://github.com/adilsr-sec/Arjuna-s-Astra/wiki)

## ⚠️ Legal Disclaimer

**IMPORTANT**: This tool is provided for educational, research, and authorized security purposes only.

- Users are **fully responsible** for ensuring compliance with all applicable local, state, national, and international laws
- Cryptography and steganography technologies are regulated in many jurisdictions
- **Unauthorized use** of this tool may violate laws in your jurisdiction
- By using this software, you acknowledge understanding and accepting these legal implications
- The developers assume no liability for misuse or legal violations
- Always obtain proper authorization before using secure communications tools

## 🎯 Roadmap

- [ ] Enhanced UI/UX improvements
- [ ] Multi-format image support (PNG, JPEG, BMP, etc.)
- [ ] Multi-format audio support (MP3, WAV, FLAC, etc.)
- [ ] Batch processing capabilities
- [ ] Comprehensive API documentation (Swagger/OpenAPI)
- [ ] Docker containerization
- [ ] Kubernetes deployment configs
- [ ] Enhanced key management system
- [ ] Performance optimization and benchmarks
- [ ] Mobile application
- [ ] End-to-end encryption for key exchange
- [ ] Audit logging and compliance features

## 🔗 Resources

- [ARSS Audio Steganography](https://www.researchgate.net/publication/268502830_Audio_Steganography_using_Spectrogram)
- [AES Encryption Standard](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard)
- [Steganography Overview](https://en.wikipedia.org/wiki/Steganography)
- [OWASP Security Guidelines](https://owasp.org/)

## 📊 Statistics

- **Language Composition**: TypeScript (42.3%) | JavaScript (24.9%) | Python (20.6%) | CSS (12.2%)
- **Repository Type**: Full-Stack Web Application
- **Primary Framework**: React (Frontend) + Flask/FastAPI (Backend)
- **License**: See LICENSE file

---

## 🌟 Acknowledgments

Built with dedication to secure and private communications.

**For secure communications, with integrity. 🛡️**

*Last Updated: May 26, 2026*
*Repository: [adilsr-sec/Arjuna-s-Astra](https://github.com/adilsr-sec/Arjuna-s-Astra)*
