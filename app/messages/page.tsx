'use client';

/**
 * Messages Page
 * Tabs: Inbox and Requests
 * Includes search and filter functionality
 */

import { useState } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';

type TabType = 'inbox' | 'requests';

export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const tabs: { id: TabType; label: string }[] = [
    { id: 'inbox', label: 'Inbox' },
    { id: 'requests', label: 'Requests' },
  ];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        {/* Header with search and filter */}
        <div className="sticky top-12 z-40 glass border-b border-border/50">
          <div className="max-w-2xl mx-auto px-4">
            {/* Title row with icons */}
            <div className="flex items-center justify-between py-3">
              <h1 className="text-lg font-semibold">Messages</h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                  aria-label="Search messages"
                >
                  <SearchIcon className="w-5 h-5 text-muted-foreground" />
                </button>
                <button
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                  aria-label="Filter messages"
                >
                  <FilterIcon className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Search bar - collapsible */}
            {showSearch && (
              <div className="pb-3">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search messages..."
                    className="w-full bg-secondary border-0 rounded-lg pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                  {tab.id === 'requests' && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
                      3
                    </span>
                  )}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-4 py-4">
          {activeTab === 'inbox' ? (
            <InboxContent searchQuery={searchQuery} />
          ) : (
            <RequestsContent searchQuery={searchQuery} />
          )}
        </div>
      </div>
    </AuthGuard>
  );
}

function InboxContent({ searchQuery }: { searchQuery: string }) {
  // Placeholder messages - in real app, fetch from API
  const messages = [
    {
      id: '1',
      user: { name: 'John Doe', avatar: null },
      lastMessage: 'Hey, how are you doing?',
      time: '2m',
      unread: true,
    },
    {
      id: '2',
      user: { name: 'Jane Smith', avatar: null },
      lastMessage: 'Did you see the new post?',
      time: '1h',
      unread: false,
    },
    {
      id: '3',
      user: { name: 'Alex Johnson', avatar: null },
      lastMessage: 'Thanks for sharing!',
      time: '3h',
      unread: false,
    },
  ];

  const filteredMessages = messages.filter(
    (msg) =>
      msg.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filteredMessages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <MessageIcon className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">No messages yet</h3>
        <p className="text-sm text-muted-foreground">
          {searchQuery ? 'No messages match your search' : 'Start a conversation with someone'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {filteredMessages.map((msg) => (
        <button
          key={msg.id}
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors text-left"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-medium flex-shrink-0">
            {msg.user.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className={`font-medium ${msg.unread ? 'text-foreground' : 'text-foreground/80'}`}>
                {msg.user.name}
              </span>
              <span className="text-xs text-muted-foreground">{msg.time}</span>
            </div>
            <p className={`text-sm truncate ${msg.unread ? 'text-foreground' : 'text-muted-foreground'}`}>
              {msg.lastMessage}
            </p>
          </div>
          {msg.unread && (
            <span className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />
          )}
        </button>
      ))}
    </div>
  );
}

function RequestsContent({ searchQuery }: { searchQuery: string }) {
  // Placeholder requests - in real app, fetch from API
  const requests = [
    {
      id: '1',
      user: { name: 'New User', avatar: null },
      message: 'Hey! I saw your profile and...',
      time: '5m',
    },
    {
      id: '2',
      user: { name: 'Someone', avatar: null },
      message: 'Would love to connect!',
      time: '2h',
    },
    {
      id: '3',
      user: { name: 'Another Person', avatar: null },
      message: 'Hi there!',
      time: '1d',
    },
  ];

  const filteredRequests = requests.filter(
    (req) =>
      req.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filteredRequests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <RequestIcon className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">No requests</h3>
        <p className="text-sm text-muted-foreground">
          {searchQuery ? 'No requests match your search' : 'Message requests will appear here'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {filteredRequests.map((req) => (
        <div
          key={req.id}
          className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/50"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-muted to-secondary flex items-center justify-center text-muted-foreground font-medium flex-shrink-0">
            {req.user.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-medium">{req.user.name}</span>
              <span className="text-xs text-muted-foreground">{req.time}</span>
            </div>
            <p className="text-sm text-muted-foreground truncate">{req.message}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button className="px-3 py-1.5 text-sm font-medium rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
              Delete
            </button>
            <button className="px-3 py-1.5 text-sm font-medium rounded-lg btn-gradient text-white">
              Accept
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Icons
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
    </svg>
  );
}

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  );
}

function RequestIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}
