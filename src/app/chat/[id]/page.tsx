"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/toast';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  ArrowLeft, Send, Image as ImageIcon, Loader2, 
  CheckCheck, Check, Phone, ShieldAlert, Sparkles 
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function ChatRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  
  const orderId = params.id as string;

  // DB States
  const [order, setOrder] = useState<any | null>(null);
  const [room, setRoom] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [otherUser, setOtherUser] = useState<any | null>(null);

  // Input States
  const [inputText, setInputText] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Realtime Interactivity
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<any>(null);

  // Redirect unauthorized
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading]);

  // Fetch Order and Chat details
  useEffect(() => {
    if (!user || !orderId) return;

    const fetchChatDetails = async () => {
      // 1. Fetch Order and verify roles
      const { data: ord, error: ordErr } = await supabase
        .from('orders')
        .select('*, request:service_requests(*), customer:users(*), provider:users(*)')
        .eq('id', orderId)
        .maybeSingle();

      if (ordErr || !ord) {
        toastError('Chat room order not found.');
        router.push('/');
        return;
      }

      // Role check: must be customer or provider of this order
      if (ord.customer_id !== user.id && ord.provider_id !== user.id && user.role !== 'admin') {
        toastError('Access denied to this chat room.');
        router.push('/');
        return;
      }

      setOrder(ord);

      // Identity other user
      const isCustomer = ord.customer_id === user.id;
      const other = isCustomer ? ord.provider : ord.customer;
      setOtherUser(other);

      // 2. Fetch Chat Room
      const { data: rm } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();

      if (rm) {
        setRoom(rm);
        fetchMessages(rm.id);
        markMessagesAsRead(rm.id);
      } else {
        // Fallback: create chat room if missing
        const { data: newRm } = await supabase
          .from('chat_rooms')
          .insert({ order_id: orderId })
          .select('*')
          .single();
        if (newRm) {
          setRoom(newRm);
          fetchMessages(newRm.id);
        }
      }
    };

    fetchChatDetails();
  }, [user, orderId]);

  // Set up Supabase Realtime channel for messages and typing indicators
  useEffect(() => {
    if (!room || !user) return;

    // Scroll to bottom on load
    scrollToBottom();

    // Initialize channel
    const channelName = `chat-room-${room.id}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      // Listen to new messages inserted in database
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages', 
        filter: `room_id=eq.${room.id}` 
      }, async (payload) => {
        // Fetch new message with sender profile
        const { data: newMsg } = await supabase
          .from('chat_messages')
          .select('*, sender:users(*)')
          .eq('id', payload.new.id)
          .single();

        if (newMsg) {
          setMessages(prev => [...prev, newMsg]);
          scrollToBottom();

          // Mark as read if received from other user
          if (newMsg.sender_id !== user.id) {
            markMessagesAsRead(room.id);
          }
        }
      })
      // Listen to read receipts updates
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${room.id}`
      }, () => {
        // Simply re-fetch to update read receipt checkmarks
        fetchMessages(room.id);
      })
      // Listen to Broadcast Typing event
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId !== user.id) {
          setOtherUserTyping(payload.isTyping);
        }
      })
      // Listen to Presence (Online check)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // Check if other user is in presence state
        const otherUserInRoom = Object.values(state).flat().some((p: any) => p.userId === otherUser?.id);
        setOtherUserOnline(otherUserInRoom);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track user presence
          await channel.track({ userId: user.id, onlineAt: new Date().toISOString() });
        }
      });

    // Offline database-less polling sync fallback
    const interval = setInterval(() => {
      fetchMessages(room.id);
    }, 1500);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [room, otherUser]);

  const fetchMessages = async (roomId: string) => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*, sender:users(*)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
    
    if (data) {
      setMessages(data);
      scrollToBottom();
    }
  };

  const markMessagesAsRead = async (roomId: string) => {
    if (!user) return;
    await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('room_id', roomId)
      .neq('sender_id', user.id)
      .eq('is_read', false);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Typing Broadcaster
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    // Broadcast typing = true
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: user?.id, isTyping: true }
      });
    }

    // Clear old timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Set timeout to broadcast typing = false after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: { userId: user?.id, isTyping: false }
        });
      }
    }, 2000);
  };

  // Send Text Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !room || !user) return;

    const textToSend = inputText.trim();
    setInputText('');

    // Stop typing indicator
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: user.id, isTyping: false }
      });
    }

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: room.id,
          sender_id: user.id,
          message: textToSend,
          image_url: null,
          is_read: false,
        });

      if (error) throw error;
      scrollToBottom();
    } catch (err: any) {
      toastError(err.message || 'Failed to send message.');
    }
  };

  // Send Image Message
  const handleImageSend = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && room && user) {
      const file = e.target.files[0];
      setUploadingImage(true);
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${room.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Upload to Supabase Storage bucket 'chat-images'
        const { error: uploadError } = await supabase.storage
          .from('chat-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('chat-images')
          .getPublicUrl(filePath);

        // Insert message
        const { error: dbError } = await supabase
          .from('chat_messages')
          .insert({
            room_id: room.id,
            sender_id: user.id,
            message: null,
            image_url: publicUrl,
            is_read: false,
          });

        if (dbError) throw dbError;
        toastSuccess('Image sent!');
        scrollToBottom();
      } catch (err: any) {
        toastError(err.message || 'Failed to upload chat image.');
      } finally {
        setUploadingImage(false);
      }
    }
  };

  if (authLoading || !user || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen max-h-screen flex-col bg-background overflow-hidden">
      <main className="mx-auto flex-1 w-full max-w-4xl px-4 py-4 flex flex-col h-full min-h-0 overflow-hidden">
        {/* Back Button & Chat Header */}
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-foreground"
              onClick={() => router.push(`/${user.role}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={otherUser?.profile_image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${otherUser?.full_name}`}
                  alt={otherUser?.full_name}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${
                  otherUserOnline ? 'bg-green-500' : 'bg-muted border-muted-foreground/30'
                }`} />
              </div>
              <div>
                <h2 className="text-sm md:text-base font-bold text-foreground">{otherUser?.full_name}</h2>
                <span className="text-[10px] md:text-xs text-muted-foreground">
                  {otherUserOnline ? 'Active Now' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Call */}
          <a href={`tel:${otherUser?.mobile_number}`} className="sm:inline-block">
            <Button variant="outline" size="sm" className="rounded-xl border-border bg-card text-foreground hover:bg-muted font-bold flex items-center gap-1.5">
              <Phone className="h-4 w-4 text-green-500" />
              Call
            </Button>
          </a>
        </div>

        {/* Messaging Box */}
        <Card className="flex-1 flex flex-col border-border bg-card overflow-hidden h-full rounded-2xl">
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm text-center p-6">
                <Sparkles className="h-8 w-8 text-primary/40 mb-2" />
                <p>This is the start of your chat. Keep messages friendly and professional!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === user.id;
                
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-start gap-2 max-w-[80%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar */}
                      {!isMine && (
                        <img
                          src={msg.sender?.profile_image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${msg.sender?.full_name}`}
                          alt="avatar"
                          className="h-7 w-7 rounded-full object-cover mt-0.5 border border-primary/10"
                        />
                      )}
                      
                      {/* Content bubble */}
                      <div className="flex flex-col">
                        <div className={`p-3 rounded-2xl text-sm ${
                          isMine 
                            ? 'insta-gradient text-white rounded-tr-xs' 
                            : 'bg-muted text-foreground rounded-tl-xs'
                        }`}>
                          {msg.message && <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>}
                          {msg.image_url && (
                            <img
                              src={msg.image_url}
                              alt="attachment"
                              className="max-h-60 rounded-lg object-contain bg-black/5"
                            />
                          )}
                        </div>
                        
                        {/* Time & Read checkmark */}
                        <div className={`flex items-center gap-1.5 text-[9px] text-muted-foreground mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isMine && (
                            msg.is_read ? (
                              <CheckCheck className="h-3 w-3 text-blue-500" />
                            ) : (
                              <Check className="h-3 w-3 text-muted-foreground" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing Indicator */}
            {otherUserTyping && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 max-w-[80%]">
                  <img
                    src={otherUser?.profile_image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${otherUser?.full_name}`}
                    alt="avatar"
                    className="h-7 w-7 rounded-full object-cover border border-primary/10"
                  />
                  <div className="bg-muted text-foreground px-4 py-2.5 rounded-2xl rounded-tl-xs text-xs font-semibold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messageEndRef} />
          </div>

          {/* Form input controls */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-border flex items-center gap-2.5 bg-background/50">
            {/* Image Upload Input */}
            <label className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card border border-border text-muted-foreground hover:text-primary hover:bg-muted cursor-pointer transition-colors">
              {uploadingImage ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <ImageIcon className="h-5 w-5" />
              )}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleImageSend}
                disabled={uploadingImage}
              />
            </label>

            {/* Text Input */}
            <Input
              placeholder="Message..."
              className="flex-1 rounded-xl h-10 border-border bg-card pr-3 py-2 text-sm focus-visible:ring-offset-0 focus-visible:ring-1"
              value={inputText}
              onChange={handleInputChange}
            />

            {/* Send Button */}
            <Button 
              type="submit" 
              size="icon" 
              className="rounded-xl h-10 w-10 shrink-0 bg-primary text-white hover:bg-primary-hover shadow-sm"
              disabled={!inputText.trim()}
            >
              <Send className="h-4.5 w-4.5" />
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
