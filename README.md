# Language Learning Voice Assistant

A production-ready React Native mobile app built with Expo and TypeScript that enables users to have voice conversations with an AI language learning assistant.

## 🚀 Features

- **Voice Recording**: Record audio using device microphone with real-time duration display
- **File Upload**: Select and upload existing audio files from device storage
- **Real-time Processing**: Upload audio with progress tracking and immediate transcript display
- **Smart Audio Polling**: Automatically checks for and downloads processed audio responses
- **Audio Playback**: Full-featured audio player with play/pause/seek controls
- **Conversation History**: Local storage of past conversations with replay functionality
- **Offline Support**: Graceful handling of network issues and offline states
- **Accessibility**: Screen reader support and proper accessibility labels

screenshot
https://github.com/user-attachments/assets/997d1d56-b1f3-4b68-9b62-0111a2460ec3

![WhatsApp Image 2025-09-15 at 12 45 35 AM](https://github.com/user-attachments/assets/a696c851-42f3-4be7-99f5-073748f796a7)
![WhatsApp Image 2025-09-15 at 12 45 35 AM (1)](https://github.com/user-attachments/assets/bf87d4f7-bfeb-4cdb-be44-b76e886c7ed6)


## 🏗️ Architecture

### Project Structure

```
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx          # Record Screen
│   │   ├── conversation.tsx   # Conversation Display
│   │   ├── history.tsx        # History Management
│   │   └── _layout.tsx        # Tab Navigation
│   └── _layout.tsx            # Root Layout
├── components/
│   ├── RecordButton.tsx       # Animated record button
│   ├── AudioPlayer.tsx        # Full-featured audio player
│   ├── ProgressBar.tsx        # Upload/download progress
│   └── StatusBadge.tsx        # Status indicators
├── hooks/
│   ├── useRecorder.ts         # Audio recording logic
│   └── useAudioPlayer.ts      # Audio playback logic
├── services/
│   ├── ConversationService.ts # API communication & polling
│   └── StorageService.ts      # Local data persistence
├── types/
│   └── api.ts                 # TypeScript interfaces
└── __tests__/                 # Unit tests
```

### Custom Hooks

- **`useRecorder`**: Manages audio recording, permissions, and duration tracking
- **`useAudioPlayer`**: Handles audio loading, playback controls, and position tracking

### Services

- **`ConversationService`**: Handles API communication, file uploads, and audio polling
- **`StorageService`**: Manages local conversation history using AsyncStorage

## 🛠️ Setup & Installation

### Prerequisites

- Node.js 16+ and npm
- Expo CLI: `npm install -g @expo/cli`
- iOS Simulator / Android Emulator or physical device

### Environment Configuration

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Configure your environment variables in `.env`:
   ```env
   EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
   EXPO_PUBLIC_API_TOKEN=your_api_token_here
   EXPO_PUBLIC_DEBUG=false
   ```

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

### Running on Different Platforms

- **Web**: Press `w` in the terminal or visit the displayed URL
- **iOS Simulator**: Press `i` (requires Xcode on macOS)
- **Android Emulator**: Press `a` (requires Android Studio)
- **Physical Device**: Scan the QR code with Expo Go app

## 📱 Usage

### Recording & Uploading

1. **Grant Microphone Permission**: Tap "Grant Permission" when prompted
2. **Record Audio**: Tap the blue record button to start/stop recording
3. **Upload**: Tap "Send Recording" to upload your audio
4. **Alternative**: Use "Select Audio File" to choose an existing file

### Conversation Flow

1. After upload, you'll immediately see:
   - Your speech transcript
   - Assistant's text response
   - Audio processing status

2. The app automatically:
   - Polls the server every 2 seconds for the audio response
   - Downloads the audio when ready
   - Enables playback controls

3. Use the audio player to:
   - Play/pause the response
   - Seek to specific positions
   - Monitor playback progress

### History Management

- View all past conversations in the History tab
- Play cached audio responses
- Delete individual conversations
- Clear all history

## 🔧 API Integration

### Backend Server Requirements

**IMPORTANT**: Before using the app, ensure your backend server is running and properly configured:

1. **Start Your Backend Server**: The app expects a server running at `http://localhost:3000` by default
2. **CORS Configuration**: Your server must allow requests from `http://localhost:8081` (Expo web dev server)
3. **API Endpoint**: Ensure `/conversation` POST endpoint is implemented and accessible

### Common Issues & Troubleshooting

#### "Network Error" or "Connection Error"
- **Cause**: Backend server is not running or not accessible
- **Solution**: 
  1. Start your backend server: `npm start` or equivalent
  2. Verify it's running at the URL specified in your `.env` file
  3. Test with curl: `curl http://localhost:3000/health` (if you have a health endpoint)

#### CORS Errors (Web Browser Only)
- **Cause**: Backend doesn't allow requests from Expo's dev server origin
- **Solution**: Configure your backend to allow CORS from `http://localhost:8081`
  
  Example for Express.js:
  ```javascript
  const cors = require('cors');
  app.use(cors({
    origin: ['http://localhost:8081', 'http://localhost:3000'],
    credentials: true
  }));
  ```

#### "API endpoint not found" (404 Error)
- **Cause**: `/conversation` endpoint is not implemented or URL is incorrect
- **Solution**: Verify your backend has the POST `/conversation` route implemented

### Expected Server Response

Your `/conversation` endpoint should return:

```json
{
  "success": true,
  "transcript": "Hello, how are you today?",
  "reply_text": "I'm doing great! How can I help you with your language learning?",
  "reply_audio_url": "/static/tts_outputs/uuid-12345.mp3",
  "timings": {
    "stt_time": 1.2,
    "llm_time": 0.8,
    "tts_time": 2.1
  }
}
```

### Testing with cURL

**Before testing the app, verify your backend works with cURL:**

```bash
# Test if server is running
curl -I http://localhost:3000/

# Test the conversation endpoint
curl -X POST http://localhost:3000/conversation \
  -H "Authorization: Bearer your_token" \
  -F "file=@test-audio.wav" \
  -F "lang=en" \
  -F "target_lang=en"

## 🔄 Polling Implementation

### How Polling Works

The app implements intelligent polling for audio responses:

1. **Initial Check**: Immediately after receiving the API response
2. **Polling Interval**: Checks every 2 seconds using HTTP HEAD requests
3. **Timeout**: Stops after 60 seconds with retry option
4. **Download**: When audio is ready, downloads to local cache
5. **Cleanup**: Automatically manages cache and stops unnecessary polling

### Why This Approach?

- **Immediate Feedback**: Users see transcript/reply immediately
- **Efficient**: HEAD requests minimize bandwidth usage
- **Resilient**: Handles temporary network issues and server delays
- **User-Friendly**: Clear status indicators and retry options

### Configuration

Adjust polling behavior in `ConversationService.ts`:

```typescript
// Polling interval (default: 2 seconds)
const pollInterval = 2000;

// Timeout duration (default: 60 seconds)
const timeout = 60000;
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Test Coverage

The project includes comprehensive tests for:
- `useRecorder` hook functionality
- `ConversationService` API interactions
- Error handling and edge cases
- Polling mechanisms

## 📱 Production Considerations

### Security

- **HTTPS**: Always use HTTPS in production
- **API Keys**: Store tokens securely, never commit to version control
- **CORS**: Configure proper CORS headers on your server
- **Input Validation**: Validate file types and sizes

### Performance

- **File Size Limits**: Implement reasonable audio file size restrictions
- **Cache Management**: Implement cache cleanup for old audio files
- **Network Optimization**: Consider compression for audio uploads
- **Memory Management**: Properly cleanup audio resources

### UX Improvements

- **Push Notifications**: Notify users when long-running audio processing completes
- **Background Processing**: Handle app backgrounding during uploads
- **Progressive Upload**: Consider chunked uploads for large files
- **Error Recovery**: Implement automatic retry mechanisms

### Monitoring

- **Analytics**: Track upload success rates, processing times
- **Error Logging**: Implement comprehensive error reporting
- **Performance Metrics**: Monitor app performance and audio quality

## 🚀 Deployment

### Building for Production

```bash
# Build for web
npm run build:web

# Build for iOS/Android (requires EAS)
npx eas build --platform ios
npx eas build --platform android
```

### Environment Variables for Production

Ensure production environment variables are set:
- `EXPO_PUBLIC_API_BASE_URL`: Your production API URL
- `EXPO_PUBLIC_API_TOKEN`: Production API authentication token

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Run tests: `npm test`
4. Commit changes: `git commit -am 'Add new feature'`
5. Push to branch: `git push origin feature/new-feature`
6. Submit a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

For questions or support, please open an issue or contact the development team.
