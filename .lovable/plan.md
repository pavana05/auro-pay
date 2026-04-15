

# Chat & In-App Messaging Feature Plan

## Overview
Build a full-featured chat system inspired by the reference image, with dark + blue theme, supporting text messages, voice messages, and in-chat money transfers between friends and recent payment contacts.

## Database Changes (3 new tables + 1 migration)

### 1. `conversations` table
- `id` (uuid, PK), `type` (text: 'direct' | 'group'), `title` (text, nullable — for group chats), `created_at`, `updated_at`
- RLS: users can view conversations they're members of

### 2. `conversation_members` table
- `id` (uuid, PK), `conversation_id` (uuid, FK → conversations), `user_id` (uuid), `joined_at`, `last_read_at`
- RLS: users can view/manage their own memberships

### 3. `messages` table
- `id` (uuid, PK), `conversation_id` (uuid, FK → conversations), `sender_id` (uuid), `content` (text, nullable), `message_type` (text: 'text' | 'voice' | 'payment'), `voice_url` (text, nullable), `payment_amount` (integer, nullable), `payment_status` (text, nullable), `created_at`
- RLS: users can read messages in their conversations, insert messages in their conversations
- Enable realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;`

### 4. Supabase Storage bucket
- Create `voice-messages` bucket for audio recordings

## New Pages & Components

### 1. `src/pages/ChatList.tsx` — Chat List Screen
- Dark background with blue accent theme (matching reference image)
- **Top section**: Horizontal scrollable friend avatars (like reference)
- **Recent Chats**: List with avatar, name, last message preview, timestamp, unread badge
- **Group Chat** section at bottom
- Search bar to filter chats
- FAB button to start new chat (pick from friends or recent payment contacts)
- Auto-create conversations from recent QuickPay transactions

### 2. `src/pages/ChatRoom.tsx` — Individual Chat Screen
- Header: contact name, online status, back button
- Message bubbles: sender (right, blue/primary), receiver (left, dark card)
- **Text input** with send button
- **Voice message**: hold-to-record button with waveform animation, "slide to cancel" UX
- **Payment button**: tap to open inline payment panel — enter amount, add note, send money (uses existing p2p-transfer edge function)
- Payment cards rendered inline in chat (like reference — showing amount, status)
- Real-time message subscription via Supabase Realtime
- Smooth scroll-to-bottom, typing indicators

### 3. `src/components/chat/` — Shared components
- `MessageBubble.tsx` — text/voice/payment message rendering
- `VoiceRecorder.tsx` — record audio, upload to storage, send as message
- `PaymentCard.tsx` — inline payment card in chat (shows amount, status, Visa-style card from reference)
- `ChatInput.tsx` — input bar with text, voice, and payment toggle

## Extra Features
- **Unread message count** badge on BottomNav or Friends page
- **Online status** indicator (green dot) on chat list
- **Message timestamps** grouped by day ("Today", "Yesterday", dates)
- **Quick-reply from notification** support
- **Auto-suggest contacts**: merge friends list + recent QuickPay favorites into chat contacts

## Route Changes (`App.tsx`)
- Add `/chats` → `ChatList`
- Add `/chat/:conversationId` → `ChatRoom`

## Technical Details

- Voice recording uses `MediaRecorder` API → upload blob to Supabase Storage `voice-messages` bucket → store URL in message
- Payment messages call existing `p2p-transfer` edge function, then insert a message with `type: 'payment'`
- Realtime subscription on `messages` table filtered by `conversation_id`
- Theme: dark background (#0a0c0f), blue accent (#3B82F6) for sent messages, dark cards for received
- All animations use existing `slide-up-spring` keyframes + new subtle entrance animations

## Files to Create/Edit
- **Create**: `src/pages/ChatList.tsx`, `src/pages/ChatRoom.tsx`, `src/components/chat/MessageBubble.tsx`, `src/components/chat/VoiceRecorder.tsx`, `src/components/chat/PaymentCard.tsx`, `src/components/chat/ChatInput.tsx`
- **Edit**: `src/App.tsx` (add routes), `src/components/BottomNav.tsx` (add chat icon), `src/index.css` (new animations)
- **Migration**: Create 3 tables, storage bucket, realtime publication

