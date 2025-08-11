import React, { useState, useEffect } from 'react';
import { X, Copy, ExternalLink, Send, CheckCircle, AlertCircle, Users, MessageSquare, Calendar } from 'lucide-react';
import { useTelegram, TelegramChat } from '../hooks/useTelegram';

interface TelegramConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TelegramConnectionModal: React.FC<TelegramConnectionModalProps> = ({ isOpen, onClose }) => {
  const {
    chats,
    generateLinkToken,
    disconnectChat,
    sendMessage,
    loading,
    error,
    setError,
    isConnected,
    getActiveChatCount
  } = useTelegram();

  const [linkUrl, setLinkUrl] = useState<string>('');
  const [generatingToken, setGeneratingToken] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState<string | null>(null);

  // Generate initial link token when modal opens
  useEffect(() => {
    if (isOpen && !isConnected() && !linkUrl && !generatingToken) {
      handleGenerateLink();
    }
  }, [isOpen, isConnected, linkUrl, generatingToken]);

  const handleGenerateLink = async () => {
    setGeneratingToken(true);
    setError(null);
    
    try {
      const result = await generateLinkToken();
      if (result) {
        setLinkUrl(result.deepLink);
      }
    } catch (err) {
      console.error('Failed to generate link:', err);
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(linkUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleOpenTelegram = () => {
    if (linkUrl) {
      window.open(linkUrl, '_blank');
    }
  };

  const handleDisconnectChat = async (chat: TelegramChat) => {
    const success = await disconnectChat(chat.chat_id);
    if (success) {
      console.log('Chat disconnected successfully');
    }
  };

  const handleSendTestMessage = async (chatId?: string) => {
    if (!testMessage.trim()) return;
    
    setSendingMessage(chatId || 'all');
    try {
      const success = await sendMessage(testMessage, { chatId });
      if (success) {
        setTestMessage('');
        console.log('Test message sent successfully');
      }
    } catch (err) {
      console.error('Failed to send test message:', err);
    } finally {
      setSendingMessage(null);
    }
  };

  const formatChatName = (chat: TelegramChat) => {
    if (chat.title) return chat.title; // Group/Channel name
    if (chat.first_name) {
      return chat.last_name ? `${chat.first_name} ${chat.last_name}` : chat.first_name;
    }
    return chat.username ? `@${chat.username}` : `Chat ${chat.chat_id}`;
  };

  const getChatTypeIcon = (chatType: string) => {
    switch (chatType) {
      case 'group':
      case 'supergroup':
        return <Users className="w-4 h-4" />;
      case 'channel':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Send className="w-4 h-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Telegram Integration</h2>
              <p className="text-gray-400 text-sm">
                {isConnected() ? `${getActiveChatCount()} chat(s) connected` : 'Connect your Telegram'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Error Display */}
          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-300">{error}</span>
              </div>
            </div>
          )}

          {!isConnected() ? (
            /* Connection Setup */
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Connect Your Telegram
                </h3>
                <p className="text-gray-400 mb-6">
                  Link your Telegram account to receive automated messages from your workflows.
                </p>
              </div>

              {/* Step-by-step instructions */}
              <div className="bg-gray-700/50 rounded-lg p-6 space-y-4">
                <h4 className="font-semibold text-white mb-3">How to connect:</h4>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      1
                    </div>
                    <div className="text-gray-300">
                      <span className="font-medium">Generate a secure link</span>
                      <p className="text-sm text-gray-400 mt-1">
                        Click the button below to create your unique connection link
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      2
                    </div>
                    <div className="text-gray-300">
                      <span className="font-medium">Open in Telegram</span>
                      <p className="text-sm text-gray-400 mt-1">
                        The link will take you to our bot in Telegram
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      3
                    </div>
                    <div className="text-gray-300">
                      <span className="font-medium">Automatic linking</span>
                      <p className="text-sm text-gray-400 mt-1">
                        Your chat will be automatically linked to your FlowBot account
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Link Generation */}
              <div className="space-y-4">
                {!linkUrl ? (
                  <button
                    onClick={handleGenerateLink}
                    disabled={generatingToken}
                    className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {generatingToken ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Generating Link...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Generate Connection Link</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 p-3 bg-gray-700 rounded-lg">
                      <input
                        type="text"
                        value={linkUrl}
                        readOnly
                        className="flex-1 bg-transparent text-gray-300 text-sm outline-none"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors flex items-center space-x-1"
                      >
                        {copySuccess ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleOpenTelegram}
                        className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Open in Telegram</span>
                      </button>
                      <button
                        onClick={handleGenerateLink}
                        disabled={generatingToken}
                        className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        Regenerate
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 text-center">
                      Link expires in 1 hour. You can generate a new one anytime.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Connected State */
            <div className="space-y-6">
              <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-300 font-medium">
                    Telegram Connected Successfully!
                  </span>
                </div>
                <p className="text-green-200 text-sm mt-1">
                  Your workflows can now send messages to your connected Telegram chat(s).
                </p>
              </div>

              {/* Connected Chats */}
              <div>
                <h4 className="font-semibold text-white mb-3">Connected Chats</h4>
                <div className="space-y-2">
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg border border-gray-600"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-blue-400">
                          {getChatTypeIcon(chat.chat_type)}
                        </div>
                        <div>
                          <div className="text-white font-medium">
                            {formatChatName(chat)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {chat.chat_type} • Connected {new Date(chat.linked_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDisconnectChat(chat)}
                        className="px-3 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                      >
                        Disconnect
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Test Message */}
              <div>
                <h4 className="font-semibold text-white mb-3">Test Message</h4>
                <div className="space-y-3">
                  <textarea
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Enter a test message..."
                    rows={3}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleSendTestMessage()}
                      disabled={!testMessage.trim() || sendingMessage === 'all'}
                      className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                    >
                      {sendingMessage === 'all' ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Send to All Chats</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">
                    This will send a test message to all your connected Telegram chats.
                  </p>
                </div>
              </div>

              {/* Add New Chat */}
              <div className="pt-4 border-t border-gray-700">
                <button
                  onClick={handleGenerateLink}
                  disabled={generatingToken}
                  className="w-full py-2 px-4 border-2 border-dashed border-gray-600 text-gray-400 rounded-lg hover:border-blue-500 hover:text-blue-400 transition-colors flex items-center justify-center space-x-2"
                >
                  {generatingToken ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Connect Another Chat</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TelegramConnectionModal;
