# Security Specification for ipin Messenger Web App

## 1. Data Invariants
- A user profile at `/users/{userId}` can only be created and updated by the authenticated user whose `request.auth.uid == userId`.
- An active presence document at `/active_presences/{userId}` can only be modified by the matching authenticated user.
- A conversation at `/conversations/{conversationId}` can be created by authenticated users who include themselves in `participantIds`. Updates are limited to participant list or conversation metadata (e.g. `lastMessageText`, `lastMessageTime`, `updatedAt`).
- A message at `/conversations/{conversationId}/messages/{messageId}` must have `senderId == request.auth.uid`.
- Updating a message is restricted to:
  1. The author editing their own message text/media, OR
  2. Any conversation participant adding/updating their own entry in `reactions` or appending their UID to `readBy`.
- A story at `/stories/{storyId}` can only be created by an authenticated user with `userId == request.auth.uid` and deleted by the author. Updating is restricted to appending to the `viewers` list.

## 2. The Dirty Dozen Payloads
1. **User Impersonation Write**: Attacker attempting to create/modify `/users/victim_123` with `request.auth.uid = attacker_456`. (Expect PERMISSION_DENIED)
2. **Ghost Field Injection**: Adding undocumented root fields like `isAdmin: true` to a user profile. (Expect PERMISSION_DENIED)
3. **Presence Hijack**: Modifying someone else's active heartbeat at `/active_presences/victim_123`. (Expect PERMISSION_DENIED)
4. **Forged Message Sender**: Sending a message into `/conversations/conv1/messages/m1` where `senderId` is set to someone else. (Expect PERMISSION_DENIED)
5. **Unauthorized Message Read-By Spoof**: User overwriting someone else's reaction in the reactions dictionary. (Expect PERMISSION_DENIED)
6. **Malicious Conversation Hijack**: User updating a private conversation they are not a participant of. (Expect PERMISSION_DENIED)
7. **Oversized Message String Attack (Denial of Wallet)**: Injecting 2MB payload string into `text` field. (Expect PERMISSION_DENIED)
8. **Story Deletion by Non-Owner**: Attempting to delete `/stories/story_999` created by another user. (Expect PERMISSION_DENIED)
9. **Fake Author Story Creation**: Creating a story where `userId != request.auth.uid`. (Expect PERMISSION_DENIED)
10. **Unauthenticated Read of Private Conversations**: Anonymous user attempting to read conversations or messages. (Expect PERMISSION_DENIED)
11. **Malicious ID Path Poisoning**: Attempting to write to document IDs with path traversals or control characters. (Expect PERMISSION_DENIED)
12. **Orphaned Message Write**: Writing a message without a valid string message ID and matching conversation ID. (Expect PERMISSION_DENIED)
