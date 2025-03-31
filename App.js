import React, { useState, useRef, useEffect } from 'react';
import { 
  StatusBar, 
  SafeAreaView,
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableOpacity,
  Dimensions,
  Modal,
  Animated,
  ScrollView,
  PanResponder,
  Keyboard,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [chatSessions, setChatSessions] = useState([
    {id: '1', title: 'Chat 1', messages: []}
  ]);
  const [currentChatId, setCurrentChatId] = useState('1');
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingChatId, setEditingChatId] = useState(null);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const titleInputRef = useRef(null);
  const drawerAnimation = useRef(new Animated.Value(0)).current;
  const dismissButtonAnimation = useRef(new Animated.Value(0)).current;
  const headerAnimation = useRef(new Animated.Value(0)).current;
  const contentAnimation = useRef(new Animated.Value(0)).current;
  const { width, height } = Dimensions.get('window');
  
  // Update drawer width calculation to be responsive based on platform
  const drawerWidth = Platform.OS === 'web' 
    ? width * 0.25 // Web: 25% of screen width (quarter)
    : width * 0.75; // iOS/Android: 75% of screen width (unchanged)

  // Get the current chat's messages and title
  const currentChat = chatSessions.find(chat => chat.id === currentChatId);
  const messages = currentChat?.messages || [];
  const currentTitle = currentChat?.title || 'New Chat';

  // Handle title editing
  const handleTitleEdit = () => {
    setEditingTitle(currentTitle);
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 100);
  };

  const saveTitleEdit = () => {
    if (editingTitle.trim()) {
      setChatSessions(prevSessions => 
        prevSessions.map(session => 
          session.id === currentChatId 
            ? { ...session, title: editingTitle.trim() }
            : session
        )
      );
    }
    setIsEditingTitle(false);
  };

  // Control drawer animation
  useEffect(() => {
    if (showDrawer) {
      Animated.timing(drawerAnimation, {
        toValue: 1,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else {
      Animated.timing(drawerAnimation, {
        toValue: 0,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [showDrawer, drawerAnimation]);

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShowListener = Platform.OS === 'ios'
      ? Keyboard.addListener('keyboardWillShow', () => {
          setKeyboardVisible(true);
          // Animate dismiss button in
          Animated.timing(dismissButtonAnimation, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }).start();
        })
      : Keyboard.addListener('keyboardDidShow', () => {
          setKeyboardVisible(true);
          // Animate dismiss button in
          Animated.timing(dismissButtonAnimation, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }).start();
        });
    
    const keyboardWillHideListener = Platform.OS === 'ios'
      ? Keyboard.addListener('keyboardWillHide', () => {
          // Animate button out with keyboard
          Animated.timing(dismissButtonAnimation, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            setKeyboardVisible(false);
          });
        })
      : Keyboard.addListener('keyboardDidHide', () => {
          setKeyboardVisible(false);
          dismissButtonAnimation.setValue(0); // Immediately hide on Android
        });

    return () => {
      keyboardWillHideListener.remove();
      keyboardWillShowListener.remove();
    };
  }, []);

  // Setup pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // For downward swipes when keyboard is open, be more sensitive
        if (keyboardVisible && gestureState.dy > 5) {
          return true;
        }
        // Otherwise only respond to significant movements
        return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: () => {
        // Called when the gesture starts
        console.log("Gesture started");
      },
      onPanResponderMove: (evt, gestureState) => {
        // If keyboard is visible and user is swiping down, make sure to capture it
        if (keyboardVisible && gestureState.dy > 20) {
          console.log("Downward swipe detected while keyboard open");
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        console.log("Gesture released", gestureState.dy, keyboardVisible);
        // Left to right swipe (open drawer)
        if (gestureState.dx > 50 && !showDrawer) {
          toggleDrawer();
        }
        
        // Right to left swipe (close drawer)
        if (gestureState.dx < -50 && showDrawer) {
          toggleDrawer();
        }
        
        // Upward swipe (focus input)
        if (gestureState.dy < -50 && !keyboardVisible) {
          inputRef.current?.focus();
        }
        
        // Downward swipe (dismiss keyboard) - make this more sensitive
        if (gestureState.dy > 20 && keyboardVisible) {
          console.log("Dismissing keyboard on downward swipe");
          Keyboard.dismiss();
        }
      },
    })
  ).current;

  // Drawer-specific pan responder for handling swipes when drawer is open
  const drawerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal movements for drawer
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Right to left swipe (close drawer)
        if (gestureState.dx < -50) {
          toggleDrawer();
        }
      },
    })
  ).current;

  const translateX = drawerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth, 0],
  });

  // Modify the `useEffect` that adds welcome messages
  // Find the useEffect with welcome message logic and replace it

  useEffect(() => {
    // Initialize the app with an empty chat if needed
    if (chatSessions.length === 0) {
      setChatSessions([
        {id: '1', title: 'New Chat', messages: []}
      ]);
      setCurrentChatId('1');
    }
  }, []);

  // Mock AI responses
  const mockResponses = [
    "I'm just a simple AI assistant. How can I help you today?",
    "That's an interesting question. Let me think about it...",
    "I don't have all the answers, but I'll do my best to help!",
    "Thanks for sharing that with me.",
    "I'm still learning, but I appreciate your patience.",
    "That's a great point! I hadn't considered that before.",
    "I'm not sure I understand. Could you rephrase that?",
    "Let me see if I can help with that...",
  ];

  const getRandomResponse = () => {
    const randomIndex = Math.floor(Math.random() * mockResponses.length);
    return mockResponses[randomIndex];
  };

  const sendMessage = () => {
    if (inputText.trim()) {
      // Add user message
      const userMessage = {
        id: Date.now().toString(),
        text: inputText,
        isUser: true,
      };
      
      // Check if this is the first message in the chat
      const isFirstMessage = currentChat.messages.length === 0;
      
      setChatSessions(prevSessions => {
        return prevSessions.map(session => {
          if (session.id === currentChatId) {
            return {
              ...session,
              messages: [...session.messages, userMessage]
            };
          }
          return session;
        });
      });
      
      setInputText('');
      
      // Add AI response after a short delay to simulate thinking
      setTimeout(() => {
        // If this is the first message, send a welcome message
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          text: isFirstMessage 
            ? "Hello! I'm your friendly chatbot assistant. How can I help you today?" 
            : getRandomResponse(),
          isUser: false,
        };
        
        setChatSessions(prevSessions => {
          const newSessions = prevSessions.map(session => {
            if (session.id === currentChatId) {
              return {
                ...session,
                messages: [...session.messages, aiMessage]
              };
            }
            return session;
          });
          
          // Scroll to the latest message in the next render cycle
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          return newSessions;
        });
      }, 1000);
    }
  };

  const createNewChat = () => {
    const newChatId = Date.now().toString();
    
    setChatSessions(prevSessions => [
      ...prevSessions,
      {
        id: newChatId,
        title: 'New Chat',
        messages: []
      }
    ]);
    
    setCurrentChatId(newChatId);
    setShowDrawer(false); // Close drawer after creating new chat
  };

  const switchChat = (chatId) => {
    // Only switch and close drawer if we're not editing a title
    if (!isEditingTitle) {
    setCurrentChatId(chatId);
    setShowDrawer(false); // Close drawer after switching chat
    }
  };

  const openVoiceChat = () => {
    setShowVoiceModal(true);
  };

  const closeVoiceChat = () => {
    setShowVoiceModal(false);
  };

  const toggleDrawer = () => {
    // Dismiss keyboard if it's visible
    if (keyboardVisible) {
      Keyboard.dismiss();
    }
    setShowDrawer(!showDrawer);
  };

  const deleteChat = (chatId) => {
    if (chatSessions.length > 1) {
      setChatSessions(prevSessions => {
        const newSessions = prevSessions.filter(session => session.id !== chatId);
        
        // If we're deleting the current chat, set a new current chat ID
        if (currentChatId === chatId) {
          // Find the first chat that's not the one being deleted
          const newCurrentChat = newSessions.find(session => session.id !== chatId) || newSessions[0];
          setTimeout(() => setCurrentChatId(newCurrentChat.id), 0);
        }
        
        return newSessions;
      });
    } else {
      // If there's only one chat, create a new one before deleting the current one
      const newChatId = Date.now().toString();
      
      setChatSessions([
        {
          id: newChatId,
          title: 'New Chat',
          messages: []
        }
      ]);
      
      setCurrentChatId(newChatId);
    }
    // Close drawer after deleting a chat
    setShowDrawer(false);
  };

  // Voice Chat Modal Component
  const VoiceChatModal = () => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showVoiceModal}
        onRequestClose={closeVoiceChat}
      >
        <View style={styles.voiceModalContainer}>
          {/* Blue circle in the middle */}
          <View style={styles.voiceVisualization}>
            {/* This is just a placeholder for a voice visualization */}
          </View>
          
          {/* Bottom buttons */}
          <View style={styles.voiceButtonsContainer}>
            <TouchableOpacity style={styles.voiceButton} activeOpacity={0.7}>
              <Ionicons name="videocam" size={24} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.voiceButton} activeOpacity={0.7}>
              <Ionicons name="mic" size={24} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.voiceButton} activeOpacity={0.7}>
              <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.voiceButton} 
              activeOpacity={0.7}
              onPress={closeVoiceChat}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // EmptyChatScreen component for displaying when there are no messages
  const EmptyChatScreen = ({ chatTitle }) => {
    // Use local state for this component
    const [localInputText, setLocalInputText] = useState('');
    
    // Handle submit from this component
    const handleSubmit = () => {
      if (localInputText.trim()) {
        // Instead of updating parent state first, use the local value directly
        const messageText = localInputText;
        
        // Clear local input immediately
        setLocalInputText('');
        
        // Add user message directly
        const userMessage = {
          id: Date.now().toString(),
          text: messageText,
          isUser: true,
        };
        
        // Check if this is the first message in the chat
        const isFirstMessage = currentChat.messages.length === 0;
        
        setChatSessions(prevSessions => {
          return prevSessions.map(session => {
            if (session.id === currentChatId) {
              return {
                ...session,
                messages: [...session.messages, userMessage]
              };
            }
            return session;
          });
        });
        
        // Add AI response after a short delay to simulate thinking
        setTimeout(() => {
          const aiMessage = {
            id: (Date.now() + 1).toString(),
            text: isFirstMessage 
              ? "Hello! I'm your friendly chatbot assistant. How can I help you today?" 
              : getRandomResponse(),
            isUser: false,
          };
          
          setChatSessions(prevSessions => {
            const newSessions = prevSessions.map(session => {
              if (session.id === currentChatId) {
                return {
                  ...session,
                  messages: [...session.messages, aiMessage]
                };
              }
              return session;
            });
            
            // Scroll to the latest message in the next render cycle
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            return newSessions;
          });
        }, 1000);
      }
    };
    
    return (
      <View style={styles.emptyChatContainer}>
        {/* Menu button positioned at the top left */}
        <TouchableOpacity 
          style={styles.emptyScreenMenuButton} 
          onPress={toggleDrawer}
          accessibilityLabel="Open menu"
          accessibilityRole="button"
        >
          <Ionicons name="menu" size={24} color="#3b82f6" />
        </TouchableOpacity>
        
        <View style={styles.welcomeContainer}>
          <View style={styles.logoContainer}>
            <Ionicons name="chatbubble-ellipses" size={60} color="#3b82f6" />
          </View>
          <Text style={styles.welcomeText}>
            How may I help you?
          </Text>
          
          {/* Input box inside the welcome container */}
          <View style={styles.welcomeInputContainer}>
            <TextInput
              style={styles.welcomeInput}
              value={localInputText}
              onChangeText={setLocalInputText}
              placeholder="Message Bubl"
              onSubmitEditing={handleSubmit}
              autoCapitalize="sentences"
              returnKeyType="send"
              enablesReturnKeyAutomatically={true}
              multiline={false}
              accessibilityLabel="Message input field"
              accessibilityHint="Type your message here and press send"
            />
            <TouchableOpacity 
              style={styles.welcomeSendButton} 
              onPress={localInputText.trim() ? handleSubmit : openVoiceChat}
              activeOpacity={0.7}
              accessibilityLabel={localInputText.trim() ? "Send message" : "Voice chat"}
              accessibilityRole="button"
            >
              {localInputText.trim() ? (
                <Ionicons name="arrow-up" size={24} color="#fff" />
              ) : (
                <Ionicons name="mic" size={22} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Drawer Component
  const DrawerMenu = () => {
    return (
      <>
        {/* Only show overlay on non-web platforms */}
        {showDrawer && Platform.OS !== 'web' && (
          <TouchableOpacity 
            style={styles.overlay} 
            activeOpacity={1} 
            onPress={toggleDrawer}
            {...drawerPanResponder.panHandlers}
          />
        )}
        <Animated.View 
          style={[
            styles.drawer,
            Platform.OS === 'web' 
              ? {
                  width: drawerWidth,
                  left: drawerAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-drawerWidth, 0],
                  }),
                  zIndex: 10,
                }
              : {
                  width: drawerWidth,
                  transform: [{ 
                    translateX: drawerAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-drawerWidth, 0],
                    }) 
                  }],
                }
          ]}
          {...drawerPanResponder.panHandlers}
        >
          <SafeAreaView style={styles.drawerContent}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={22} color="#3b82f6" style={styles.searchIcon} />
                <Text style={styles.searchPlaceholder}>Search</Text>
              </View>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={createNewChat}
                accessibilityLabel="Create new chat"
                accessibilityRole="button"
              >
                <Ionicons name="add" size={28} color="#3b82f6" />
              </TouchableOpacity>
            </View>
            
            {/* Chat list */}
            <ScrollView style={styles.chatList}>
              {chatSessions.map(chat => (
                <View key={chat.id} style={styles.chatItemWrapper}>
                  <View style={[
                    styles.chatItem,
                    currentChatId === chat.id && styles.activeChatItem
                  ]}>
                    <TouchableOpacity 
                      style={styles.chatIconContainer}
                  onPress={() => switchChat(chat.id)}
                >
                  <View style={styles.chatIcon}>
                    <Ionicons name="chatbubble-ellipses-outline" size={22} color="#3b82f6" />
                  </View>
                    </TouchableOpacity>
                  <View style={styles.chatItemContent}>
                      {editingChatId === chat.id ? (
                        <TextInput
                          style={[
                            styles.chatTitle,
                            currentChatId === chat.id && styles.activeChatTitle,
                            { 
                              minWidth: 100,
                              padding: 0,
                              margin: 0,
                              borderWidth: 0,
                              backgroundColor: 'transparent'
                            }
                          ]}
                          value={editingTitle || chat.title}
                          onChangeText={(text) => {
                            setEditingTitle(text);
                          }}
                          onBlur={() => {
                            if (editingTitle && editingTitle.trim() !== chat.title) {
                              setChatSessions(prevSessions => 
                                prevSessions.map(session => 
                                  session.id === chat.id 
                                    ? { ...session, title: editingTitle.trim() }
                                    : session
                                )
                              );
                            }
                            setEditingChatId(null);
                            setEditingTitle('');
                          }}
                          autoFocus
                          selectTextOnFocus={false}
                          maxLength={30}
                          multiline={false}
                          returnKeyType="done"
                          blurOnSubmit={true}
                        />
                      ) : (
                        <TouchableOpacity 
                          onPress={() => {
                            setEditingChatId(chat.id);
                          }}
                        >
                          <Text style={[
                            styles.chatTitle,
                            currentChatId === chat.id && styles.activeChatTitle
                          ]}>
                            {chat.title}
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={() => switchChat(chat.id)}>
                    <Text style={styles.chatPreview} numberOfLines={1}>
                      {chat.messages.length > 0 
                        ? chat.messages[chat.messages.length - 1].text
                        : 'New conversation'}
                    </Text>
                      </TouchableOpacity>
                  </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.chatMenuButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      // Call deleteChat directly - logic is now handled inside the function
                      deleteChat(chat.id);
                    }}
                    accessibilityLabel="Delete chat"
                    accessibilityRole="button"
                  >
                    <Ionicons name="trash-outline" size={20} color="#ff4757" />
                </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            
            {/* User Profile */}
            <View style={styles.userProfile}>
              <View style={styles.userAvatar}>
                <Text style={styles.userInitial}>B</Text>
              </View>
              <Text style={styles.userName}>Benjamin Michals</Text>
              <TouchableOpacity>
                <Ionicons name="ellipsis-horizontal" size={24} color="#999" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      </>
    );
  };

  useEffect(() => {
    // When messages change from 0 to more, animate the header in
    if (messages.length === 1) {
      Animated.timing(headerAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [messages.length]);

  return (
    <SafeAreaView style={[
      styles.safeArea,
      messages.length === 0 && styles.safeAreaNoHeader
    ]}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {Platform.OS === 'web' ? (
          // Simplified web layout
          <View style={styles.webContainer}>
            {/* Main content - simplified for web */}
            <View 
              style={[
                styles.webContent,
                {
                  marginLeft: showDrawer ? drawerWidth : 0,
                  width: showDrawer ? `calc(100% - ${drawerWidth}px)` : '100%',
                }
              ]}
            >
              {/* Header */}
              {messages.length > 0 && (
                <View style={styles.headerContainer}>
                  <TouchableOpacity 
                    style={styles.menuButton} 
                    onPress={toggleDrawer}
                    accessibilityLabel="Open menu"
                    accessibilityRole="button"
                  >
                    <Ionicons name="menu" size={24} color="#fff" />
                  </TouchableOpacity>
                  {isEditingTitle ? (
                    <TextInput
                      ref={titleInputRef}
                      style={styles.headerTitleInput}
                      value={editingTitle}
                      onChangeText={setEditingTitle}
                      onBlur={saveTitleEdit}
                      onSubmitEditing={saveTitleEdit}
                      autoFocus
                      selectTextOnFocus
                      maxLength={30}
                      placeholder="Enter chat title"
                      placeholderTextColor="rgba(255, 255, 255, 0.7)"
                    />
                  ) : (
                    <TouchableOpacity 
                      style={styles.headerTitleContainer}
                      onPress={handleTitleEdit}
                      accessibilityLabel="Edit chat title"
                      accessibilityRole="button"
                    >
                      <Text style={styles.header}>{currentTitle}</Text>
                      <Ionicons name="pencil" size={16} color="#fff" style={styles.editIcon} />
                    </TouchableOpacity>
                  )}
                  <View style={styles.menuSpacer} />
                </View>
              )}
              
              {/* Chat container */}
              <View 
                style={styles.chatContainer}
                {...panResponder.panHandlers}
              >
                {keyboardVisible && (
                  <>
                    <TouchableOpacity 
                      style={styles.keyboardDismissOverlay}
                      activeOpacity={1}
                      onPress={() => Keyboard.dismiss()}
                    />
                    <Animated.View 
                      style={[
                        styles.keyboardDismissButtonContainer,
                        {
                          opacity: dismissButtonAnimation,
                          transform: [
                            { translateY: dismissButtonAnimation.interpolate({
                                inputRange: [0, 1],
                                outputRange: [20, 0]
                              })
                            }
                          ]
                        }
                      ]}
                    >
                      <TouchableOpacity 
                        style={styles.keyboardDismissButton}
                        activeOpacity={0.7}
                        onPress={() => Keyboard.dismiss()}
                        accessibilityLabel="Dismiss keyboard"
                        accessibilityRole="button"
                      >
                        <Ionicons name="chevron-down" size={20} color="#fff" />
                      </TouchableOpacity>
                    </Animated.View>
                  </>
                )}
                
                {messages.length === 0 ? (
                  <EmptyChatScreen chatTitle={currentTitle} />
                ) : (
                  <FlatList
                    ref={flatListRef}
                    style={styles.chatList}
                    data={messages}
                    renderItem={({ item }) => (
                      <View style={[
                        styles.messageBubble, 
                        item.isUser ? styles.userMessage : styles.aiMessage,
                        { maxWidth: width * 0.75 }
                      ]}>
                        <Text style={[
                          styles.messageText,
                          item.isUser ? styles.userMessageText : styles.aiMessageText
                        ]}>{item.text}</Text>
                      </View>
                    )}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.chatContent}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  />
                )}
              </View>
              
              {/* Input bar */}
              {messages.length > 0 && (
                <View style={styles.inputContainer}>
                  <TextInput
                    ref={inputRef}
                    style={styles.input}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Message Bubl"
                    onSubmitEditing={sendMessage}
                    autoCapitalize="sentences"
                    returnKeyType="send"
                    enablesReturnKeyAutomatically={true}
                    multiline={false}
                    accessibilityLabel="Message input field"
                    accessibilityHint="Type your message here and press send"
                  />
                  <TouchableOpacity 
                    style={styles.sendButton} 
                    onPress={inputText.trim() ? sendMessage : openVoiceChat}
                    activeOpacity={0.7}
                    accessibilityLabel={inputText.trim() ? "Send message" : "Voice chat"}
                    accessibilityRole="button"
                  >
                    {inputText.trim() ? (
                      <Ionicons name="arrow-up" size={24} color="#fff" />
                    ) : (
                      <Ionicons name="mic" size={22} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Voice Chat Modal */}
              <VoiceChatModal />
            </View>
            
            {/* Drawer - simplified for web */}
            {showDrawer && (
              <View style={[styles.webDrawer, { width: drawerWidth }]}>
                <SafeAreaView style={styles.drawerContent}>
                  {/* Search Bar */}
                  <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                      <Ionicons name="search" size={22} color="#3b82f6" style={styles.searchIcon} />
                      <Text style={styles.searchPlaceholder}>Search</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.createButton}
                      onPress={createNewChat}
                      accessibilityLabel="Create new chat"
                      accessibilityRole="button"
                    >
                      <Ionicons name="add" size={28} color="#3b82f6" />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Chat list */}
                  <ScrollView style={styles.chatList}>
                    {chatSessions.map(chat => (
                      <View key={chat.id} style={styles.chatItemWrapper}>
                        <View style={[
                          styles.chatItem,
                          currentChatId === chat.id && styles.activeChatItem
                        ]}>
                          <TouchableOpacity 
                            style={styles.chatIconContainer}
                            onPress={() => switchChat(chat.id)}
                          >
                            <View style={styles.chatIcon}>
                              <Ionicons name="chatbubble-ellipses-outline" size={22} color="#3b82f6" />
                            </View>
                          </TouchableOpacity>
                          <View style={styles.chatItemContent}>
                            {editingChatId === chat.id ? (
                              <TextInput
                                style={[
                                  styles.chatTitle,
                                  currentChatId === chat.id && styles.activeChatTitle,
                                  { 
                                    minWidth: 100,
                                    padding: 0,
                                    margin: 0,
                                    borderWidth: 0,
                                    backgroundColor: 'transparent'
                                  }
                                ]}
                                value={editingTitle || chat.title}
                                onChangeText={(text) => {
                                  setEditingTitle(text);
                                }}
                                onBlur={() => {
                                  if (editingTitle && editingTitle.trim() !== chat.title) {
                                    setChatSessions(prevSessions => 
                                      prevSessions.map(session => 
                                        session.id === chat.id 
                                          ? { ...session, title: editingTitle.trim() }
                                          : session
                                      )
                                    );
                                  }
                                  setEditingChatId(null);
                                  setEditingTitle('');
                                }}
                                autoFocus
                                selectTextOnFocus={false}
                                maxLength={30}
                                multiline={false}
                                returnKeyType="done"
                                blurOnSubmit={true}
                              />
                            ) : (
                              <TouchableOpacity 
                                onPress={() => {
                                  setEditingChatId(chat.id);
                                }}
                              >
                                <Text style={[
                                  styles.chatTitle,
                                  currentChatId === chat.id && styles.activeChatTitle
                                ]}>
                                  {chat.title}
                                </Text>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={() => switchChat(chat.id)}>
                              <Text style={styles.chatPreview} numberOfLines={1}>
                                {chat.messages.length > 0 
                                  ? chat.messages[chat.messages.length - 1].text
                                  : 'New conversation'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <TouchableOpacity 
                          style={styles.chatMenuButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            // Call deleteChat directly - logic is now handled inside the function
                            deleteChat(chat.id);
                          }}
                          accessibilityLabel="Delete chat"
                          accessibilityRole="button"
                        >
                          <Ionicons name="trash-outline" size={20} color="#ff4757" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                  
                  {/* User Profile */}
                  <View style={styles.userProfile}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.userInitial}>B</Text>
                    </View>
                    <Text style={styles.userName}>Benjamin Michals</Text>
                    <TouchableOpacity>
                      <Ionicons name="ellipsis-horizontal" size={24} color="#999" />
                    </TouchableOpacity>
                  </View>
                </SafeAreaView>
              </View>
            )}
          </View>
        ) : (
          // iOS/Android layout - drawer overlays content (original)
          <>
            {messages.length > 0 && (
              <Animated.View 
                style={[
                  styles.headerContainer, 
                  { opacity: headerAnimation }
                ]}
              >
                <TouchableOpacity 
                  style={styles.menuButton} 
                  onPress={toggleDrawer}
                  accessibilityLabel="Open menu"
                  accessibilityRole="button"
                >
                  <Ionicons name="menu" size={24} color="#fff" />
                </TouchableOpacity>
                {isEditingTitle ? (
                  <TextInput
                    ref={titleInputRef}
                    style={styles.headerTitleInput}
                    value={editingTitle}
                    onChangeText={setEditingTitle}
                    onBlur={saveTitleEdit}
                    onSubmitEditing={saveTitleEdit}
                    autoFocus
                    selectTextOnFocus
                    maxLength={30}
                    placeholder="Enter chat title"
                    placeholderTextColor="rgba(255, 255, 255, 0.7)"
                  />
                ) : (
                  <TouchableOpacity 
                    style={styles.headerTitleContainer}
                    onPress={handleTitleEdit}
                    accessibilityLabel="Edit chat title"
                    accessibilityRole="button"
                  >
                    <Text style={styles.header}>{currentTitle}</Text>
                    <Ionicons name="pencil" size={16} color="#fff" style={styles.editIcon} />
                  </TouchableOpacity>
                )}
                <View style={styles.menuSpacer} />
              </Animated.View>
            )}
        
        <View 
          style={styles.chatContainer}
          {...panResponder.panHandlers}
        >
          {/* Add swipe overlay when keyboard is visible */}
          {keyboardVisible && (
            <>
              <TouchableOpacity 
                style={styles.keyboardDismissOverlay}
                activeOpacity={1}
                onPress={() => Keyboard.dismiss()}
              />
              <Animated.View 
                style={[
                  styles.keyboardDismissButtonContainer,
                  {
                    opacity: dismissButtonAnimation,
                    transform: [
                      { translateY: dismissButtonAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0]
                        })
                      }
                    ]
                  }
                ]}
              >
                <TouchableOpacity 
                  style={styles.keyboardDismissButton}
                  activeOpacity={0.7}
                  onPress={() => Keyboard.dismiss()}
                  accessibilityLabel="Dismiss keyboard"
                  accessibilityRole="button"
                >
                  <Ionicons name="chevron-down" size={20} color="#fff" />
                </TouchableOpacity>
              </Animated.View>
            </>
          )}
          
              {messages.length === 0 ? (
                <EmptyChatScreen chatTitle={currentTitle} />
              ) : (
          <FlatList
            ref={flatListRef}
            style={styles.chatList}
            data={messages}
            renderItem={({ item }) => (
              <View style={[
                styles.messageBubble, 
                item.isUser ? styles.userMessage : styles.aiMessage,
                { maxWidth: width * 0.75 }
              ]}>
                <Text style={[
                  styles.messageText,
                  item.isUser ? styles.userMessageText : styles.aiMessageText
                ]}>{item.text}</Text>
              </View>
            )}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.chatContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
              )}
        </View>
        
            {/* Only show the bottom input bar when there are messages */}
            {messages.length > 0 && (
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Message Bubl"
            onSubmitEditing={sendMessage}
            autoCapitalize="sentences"
            returnKeyType="send"
            enablesReturnKeyAutomatically={true}
            multiline={false}
            accessibilityLabel="Message input field"
            accessibilityHint="Type your message here and press send"
          />
          <TouchableOpacity 
            style={styles.sendButton} 
            onPress={inputText.trim() ? sendMessage : openVoiceChat}
            activeOpacity={0.7}
            accessibilityLabel={inputText.trim() ? "Send message" : "Voice chat"}
            accessibilityRole="button"
          >
            {inputText.trim() ? (
              <Ionicons name="arrow-up" size={24} color="#fff" />
            ) : (
              <Ionicons name="mic" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
            )}
        
        {/* Voice Chat Modal */}
        <VoiceChatModal />
        
        {/* Side Drawer */}
            <Animated.View 
              style={[
                styles.drawer,
                {
                  transform: [{ 
                    translateX: drawerAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-drawerWidth, 0],
                    }) 
                  }],
                  width: drawerWidth
                }
              ]}
            >
              <SafeAreaView style={styles.drawerContent}>
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                  <View style={styles.searchBar}>
                    <Ionicons name="search" size={22} color="#3b82f6" style={styles.searchIcon} />
                    <Text style={styles.searchPlaceholder}>Search</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.createButton}
                    onPress={createNewChat}
                    accessibilityLabel="Create new chat"
                    accessibilityRole="button"
                  >
                    <Ionicons name="add" size={28} color="#3b82f6" />
                  </TouchableOpacity>
                </View>
                
                {/* Chat list */}
                <ScrollView style={styles.chatList}>
                  {chatSessions.map(chat => (
                    <View key={chat.id} style={styles.chatItemWrapper}>
                      <View style={[
                        styles.chatItem,
                        currentChatId === chat.id && styles.activeChatItem
                      ]}>
                        <TouchableOpacity 
                          style={styles.chatIconContainer}
                          onPress={() => switchChat(chat.id)}
                        >
                          <View style={styles.chatIcon}>
                            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#3b82f6" />
                          </View>
                        </TouchableOpacity>
                        <View style={styles.chatItemContent}>
                          {editingChatId === chat.id ? (
                            <TextInput
                              style={[
                                styles.chatTitle,
                                currentChatId === chat.id && styles.activeChatTitle,
                                { 
                                  minWidth: 100,
                                  padding: 0,
                                  margin: 0,
                                  borderWidth: 0,
                                  backgroundColor: 'transparent'
                                }
                              ]}
                              value={editingTitle || chat.title}
                              onChangeText={(text) => {
                                setEditingTitle(text);
                              }}
                              onBlur={() => {
                                if (editingTitle && editingTitle.trim() !== chat.title) {
                                  setChatSessions(prevSessions => 
                                    prevSessions.map(session => 
                                      session.id === chat.id 
                                        ? { ...session, title: editingTitle.trim() }
                                        : session
                                    )
                                  );
                                }
                                setEditingChatId(null);
                                setEditingTitle('');
                              }}
                              autoFocus
                              selectTextOnFocus={false}
                              maxLength={30}
                              multiline={false}
                              returnKeyType="done"
                              blurOnSubmit={true}
                            />
                          ) : (
                            <TouchableOpacity 
                              onPress={() => {
                                setEditingChatId(chat.id);
                              }}
                            >
                              <Text style={[
                                styles.chatTitle,
                                currentChatId === chat.id && styles.activeChatTitle
                              ]}>
                                {chat.title}
                              </Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity onPress={() => switchChat(chat.id)}>
                            <Text style={styles.chatPreview} numberOfLines={1}>
                              {chat.messages.length > 0 
                                ? chat.messages[chat.messages.length - 1].text
                                : 'New conversation'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <TouchableOpacity 
                        style={styles.chatMenuButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          // Call deleteChat directly - logic is now handled inside the function
                          deleteChat(chat.id);
                        }}
                        accessibilityLabel="Delete chat"
                        accessibilityRole="button"
                      >
                        <Ionicons name="trash-outline" size={20} color="#ff4757" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
                
                {/* User Profile */}
                <View style={styles.userProfile}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userInitial}>B</Text>
                  </View>
                  <Text style={styles.userName}>Benjamin Michals</Text>
                  <TouchableOpacity>
                    <Ionicons name="ellipsis-horizontal" size={24} color="#999" />
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </Animated.View>
            
            {/* Overlay when drawer is open */}
            {showDrawer && (
              <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={toggleDrawer}
              />
            )}
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#3b82f6',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    paddingTop: Platform.OS === 'ios' ? 10 : 50,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  chatList: {
    flex: 1,
    width: '100%',
    padding: 15,
  },
  chatContent: {
    paddingBottom: 10,
  },
  messageBubble: {
    padding: 14,
    borderRadius: 20,
    marginVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#3b82f6',
    marginLeft: 50,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#e5e5ea',
    marginRight: 50,
  },
  userMessageText: {
    color: '#fff',
  },
  aiMessageText: {
    color: '#000',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    width: '100%',
    padding: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    paddingVertical: 14,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f9f9f9',
    fontSize: 16,
    minHeight: 48,
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 30,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Voice modal styles
  voiceModalContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  voiceVisualization: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#3b82f6',
    marginTop: '50%',
    opacity: 0.8,
  },
  voiceButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  voiceButton: {
    backgroundColor: '#333',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButton: {
    padding: 5,
  },
  menuSpacer: {
    width: 24,
  },
  
  // Drawer styles
  overlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1,
  },
  drawer: {
    position: 'absolute',
    height: '100%',
    backgroundColor: '#fff',
    zIndex: 2,
    borderRightWidth: 1,
    borderRightColor: '#eee',
  },
  drawerContent: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#3b82f6',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  searchIcon: {
    marginRight: 8,
    color: '#3b82f6',
  },
  searchPlaceholder: {
    color: '#888',
    fontSize: 16,
  },
  createButton: {
    backgroundColor: '#fff',
    borderRadius: 25,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySpace: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userName: {
    flex: 1,
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  chatContainer: {
    flex: 1,
    width: '100%',
  },
  keyboardDismissOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  keyboardDismissButtonContainer: {
    position: 'absolute',
    bottom: 10,
    right: 15,
    alignItems: 'center',
    zIndex: 2,
  },
  keyboardDismissButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  chatItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  chatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  activeChatItem: {
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  chatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chatItemContent: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
    padding: 0,
    backgroundColor: 'transparent',
  },
  activeChatTitle: {
    color: '#3b82f6',
  },
  chatPreview: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    minWidth: 120,
    textAlign: 'center',
    padding: 0,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 255, 255, 0.5)',
  },
  editIcon: {
    marginLeft: 8,
  },
  chatMenuButton: {
    padding: 8,
    marginRight: 4,
  },
  chatIconContainer: {
    marginRight: 12,
  },
  // New styles for empty chat screen
  emptyChatContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  welcomeContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    paddingBottom: 40,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 24,
  },
  // Styles for the welcome input
  welcomeInputContainer: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 30,
    paddingHorizontal: 5,
  },
  welcomeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    paddingVertical: 14,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f9f9f9',
    fontSize: 16,
    minHeight: 48,
  },
  welcomeSendButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 30,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // New styles for empty screen
  safeAreaNoHeader: {
    backgroundColor: '#f5f5f5', // Match container background instead of blue
  },
  emptyScreenMenuButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 20 : 50,
    left: 15,
    zIndex: 10,
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    ...(Platform.OS === 'web' 
      ? { boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.2)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.2,
          shadowRadius: 2,
          elevation: 3,
        }
    ),
  },
  
  // Web-specific responsive layout styles
  webContainer: {
    flex: 1,
    position: 'relative',
  },
  webContent: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    transition: 'margin 0.25s, width 0.25s', // CSS transition for smooth animation on web
  },
  webDrawer: {
    backgroundColor: '#fff',
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: '#eee',
    boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)',
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 10,
  },
});
