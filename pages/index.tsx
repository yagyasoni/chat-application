import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import { FiSearch, FiFilter, FiPaperclip, FiMic, FiMoreVertical, FiPhone, FiVideo, FiHome, FiStar, FiMessageSquare, FiUsers, FiSettings, FiBell, FiSmile, FiClock, FiZap } from 'react-icons/fi';
import { IoSend } from "react-icons/io5";
import type { NextPage } from 'next';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Define types
interface Message {
  id: string;
  content?: string;
  sender_id: string;
  chat_id: string;
  created_at: string;
  file_url?: string;
  file_type?: string;
}

interface Chat {
  id: string;
  name: string;
  last_message?: string;
  phone: string;
}

const ChatPage: NextPage = () => {
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sidebarLogoLetter, setSidebarLogoLetter] = useState('P'); // State for sidebar logo letter
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Check authentication status
  useEffect(() => {
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        console.log('No user found or error fetching user:', error);
        router.push('/login');
      } else {
        console.log('Authenticated user:', user.id);
        setUser(user);
      }
    };
    getUser();
  }, [router]);

  // Fetch chats
  useEffect(() => {
    if (!user) return;

    const fetchChats = async () => {
      console.log('Fetching chats for user:', user.id);
      const { data, error } = await supabase
        .from('chats')
        .select('id, name, last_message, phone');
      if (error) {
        console.error('Error fetching chats:', error);
      } else {
        console.log('Raw fetched chats:', data);
        setChats(data || []);
      }
    };
    fetchChats();

    const channel = supabase
      .channel('chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, (payload) => {
        console.log('Chats table updated:', payload);
        fetchChats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Fetch messages for selected chat
  useEffect(() => {
    if (!selectedChat) return;

    const fetchMessages = async () => {
      console.log('Fetching messages for chat:', selectedChat.id);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', selectedChat.id)
        .order('created_at', { ascending: true });
      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        console.log('Fetched messages:', data);
        setMessages(data || []);
      }
    };
    fetchMessages();

    const channel = supabase
      .channel(`messages:${selectedChat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChat.id}` }, (payload) => {
        console.log('New message received via subscription:', payload.new);
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChat]);

  // Send text message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !user) {
      console.log('Cannot send message: missing data', { newMessage, selectedChat, user });
      return;
    }

    const messageData = {
      content: newMessage,
      sender_id: user.id,
      chat_id: selectedChat.id,
    };
    console.log('Attempting to send message with data:', messageData);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }

      console.log('Message inserted successfully:', data);
      setNewMessage('');

      console.log('Updating last_message for chat:', selectedChat.id);
      const { error: updateError } = await supabase
        .from('chats')
        .update({ last_message: newMessage })
        .eq('id', selectedChat.id);

      if (updateError) {
        console.error('Error updating last_message:', updateError);
      } else {
        console.log('last_message updated successfully');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile || !selectedChat || !user) {
      console.log('Cannot select file: missing data', { selectedFile, selectedChat, user });
      return;
    }

    setFile(selectedFile);
    console.log('Selected file:', selectedFile.name, selectedFile.type, selectedFile.size);

    // Show confirmation dialog
    const confirmUpload = window.confirm(`Do you want to send the file "${selectedFile.name}"?`);
    if (!confirmUpload) {
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Proceed with file upload
    await uploadFile(selectedFile);
  };

  // Handle file upload
  const uploadFile = async (selectedFile: File) => {
    if (!selectedFile || !selectedChat || !user) {
      console.log('Cannot upload file: missing data', { selectedFile, selectedChat, user });
      return;
    }

    const fileExt = selectedFile.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    console.log('Attempting to upload file to Supabase Storage:', fileName);

    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('File uploaded successfully:', uploadData);

      const { data: publicUrlData } = supabase.storage
        .from('chat-files')
        .getPublicUrl(fileName);

      const fileUrl = publicUrlData.publicUrl;
      console.log('File public URL:', fileUrl);

      const fileMessageData = {
        sender_id: user.id,
        chat_id: selectedChat.id,
        file_url: fileUrl,
        file_type: selectedFile.type,
      };
      console.log('Attempting to insert file message with data:', fileMessageData);

      const { data: insertedMessage, error: insertError } = await supabase
        .from('messages')
        .insert(fileMessageData)
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting file message:', insertError);
        throw insertError;
      }

      console.log('File message inserted successfully:', insertedMessage);

      console.log('Updating last_message for chat:', selectedChat.id);
      const { error: updateError } = await supabase
        .from('chats')
        .update({ last_message: 'Attachment' })
        .eq('id', selectedChat.id);

      if (updateError) {
        console.error('Error updating last_message:', updateError);
      } else {
        console.log('last_message updated successfully');
      }
    } catch (error) {
      console.error('File upload process failed:', error);
    } finally {
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle chat selection
  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
    // Update the sidebar logo letter to the first letter of the chat's name
    setSidebarLogoLetter(chat.name.charAt(0).toUpperCase());
  };

  // Filter chats based on search
  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) return <div className="flex h-screen items-center justify-center bg-gray-200">Loading...</div>;

  return (
    <main className="flex h-screen bg-gray-200">
      {/* Outermost Sidebar (Icons on the far left) */}
      <nav className="w-16 bg-gray-800 flex flex-col items-center py-4">
        <div className="mb-6">
          <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold">{sidebarLogoLetter}</span>
          </div>
        </div>
        <div className="flex flex-col space-y-6 text-gray-400">
          <button className="p-2 hover:text-black"><FiHome size={20} /></button>
          <button className="p-2 text-black"><FiMessageSquare size={20} /></button>
          <button className="p-2 hover:text-black"><FiStar size={20} /></button>
          <button className="p-2 hover:text-black"><FiUsers size={20} /></button>
          <button className="p-2 hover:text-black"><FiBell size={20} /></button>
          <button className="p-2 hover:text-black"><FiSettings size={20} /></button>
        </div>
      </nav>

      {/* Chat List Sidebar */}
      <aside className="w-1/3 bg-white border-r border-gray-200">
        <header className="p-3 bg-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Chats</h2>
          <div className="flex space-x-2">
            <button className="p-1"><FiFilter className="text-gray-600" size={20} /></button>
            <button className="p-1"><FiMoreVertical className="text-gray-600" size={20} /></button>
          </div>
        </header>
        <div className="p-3">
          <div className="flex items-center mb-3">
            <input
              type="text"
              placeholder="Search"
              className="w-full p-2 bg-gray-100 rounded-full text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="p-0 mx-2 hover:bg-200 rounded-full transition-colors"> <FiSearch className="ml-2 text-gray-500" size={20} /></button>
          </div>
          <nav className="overflow-y-auto max-h-[calc(100vh-120px)]">
            {filteredChats.length === 0 ? (
              <p className="text-gray-500 text-sm text-center">No chats available. Add some chats in Supabase.</p>
            ) : (
              filteredChats.map((chat) => (
                <article
                  key={chat.id}
                  className={`p-3 mb-1 flex items-center rounded cursor-pointer ${
                    selectedChat?.id === chat.id ? 'bg-blue-100' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => handleChatSelect(chat)}
                >
                  <div className="w-12 h-12 bg-gray-300 rounded-full mr-3 flex items-center justify-center">
                    <span className="text-white font-semibold">{chat.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h3 className="font-semibold text-sm">{chat.name}</h3>
                   
                    </div>
                    
                    <p className="text-xs text-gray-500">{chat.phone}</p>
                    <p className="text-xs text-gray-500 truncate">{chat.last_message || 'No messages'}</p>
                  </div>
                   <span className="text-xs text-gray-500 ml-2">
                        {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                  <span className="text-xs text-gray-500 ml-2">Demo</span>

                </article>
              ))
            )}
          </nav>
        </div>
      </aside>

      {/* Chat Area */}
      <section className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <header className="p-3 bg-gray-100 flex items-center justify-between border-b border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-300 rounded-full mr-3 flex items-center justify-center">
                  <span className="text-white font-semibold">{selectedChat.name.charAt(0)}</span>
                </div>
                <div>
                  <h2 className="text-base font-semibold">{selectedChat.name}</h2>
                  <p className="text-xs text-gray-500">{selectedChat.phone}</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button className="p-1"><FiPhone className="text-gray-600" size={20} /></button>
                <button className="p-1"><FiVideo className="text-gray-600" size={20} /></button>
                <button className="p-1"><FiMoreVertical className="text-gray-600" size={20} /></button>
              </div>
            </header>
            <div
              className="flex-1 p-4 overflow-y-auto bg-gray-100"
              style={{
                backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {messages.map((message, index) => (
                <div key={message.id} className="mb-2">
                  {(index === 0 || new Date(messages[index - 1].created_at).toDateString() !== new Date(message.created_at).toDateString()) && (
                    <div className="text-center my-2">
                      <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded">
                        {new Date(message.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                  <article
                    className={`p-2 rounded-lg max-w-xs ${
                      message.sender_id === user.id ? 'ml-auto bg-green-300 text-black' : 'bg-white'
                    }`}
                  >
                    {message.content ? (
                      <p className="text-sm">{message.content}</p>
                    ) : message.file_url ? (
                      message.file_type?.startsWith('image/') ? (
                        <img src={message.file_url} alt="Attachment" className="max-w-full rounded" onError={(e) => console.error('Error loading image:', message.file_url)} />
                      ) : message.file_type?.startsWith('video/') ? (
                        <video src={message.file_url} controls className="max-w-full rounded" onError={(e) => console.error('Error loading video:', message.file_url)} />
                      ) : (
                        <a href={message.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                          View Attachment
                        </a>
                      )
                    ) : null}
                    <div className="flex justify-end items-center mt-1">
                      <time className={`text-xs ${message.sender_id === user.id ? 'text-gray-200' : 'text-gray-400'}`}>
                        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </time>
                      {message.sender_id === user.id && (
                        <svg className="ml-1 w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg>
                      )}
                    </div>
                  </article>
                </div>
              ))}
            </div>
            <footer className="pb-0.5 pt-3 bg-white shadow-sm flex items-center">
              
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
                accept="image/*,video/*,application/*"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 mx-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <FiPaperclip className="text-gray-600" size={20} />
              </button>
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 p-3 bg-gray-100 rounded-full text-sm mx-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              
              <button
                onClick={sendMessage}
                className="p-2 mx-2 hover:bg-green-100 rounded-full transition-colors"
              >
                <IoSend className="text-green-500 hover:text-green-600" size={20} />
              </button>
              </footer>
              <footer className="p-1 bg-white shadow-sm flex items-center">
              <button
                className="p-2 mx-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <FiSmile className="text-gray-600" size={20} />
              </button>
              <button
                className="p-2 mx-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <FiClock className="text-gray-600" size={20} />
              </button>
              <button
                className="p-2 mx-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <FiMic className="text-gray-600" size={20} />
              </button>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-100">
            <p className="text-gray-500 text-sm">Select a chat to start messaging</p>
          </div>
        )}
      </section>
    </main>
  );
};

export default ChatPage;