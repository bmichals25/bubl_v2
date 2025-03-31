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
  Alert,
  Image,
  Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Define Bubl brand colors
const BUBL_COLORS = {
  lightBlue: '#7fccf2',
  mediumBlue: '#469fd9',
  darkBlue: '#25669d',
  white: '#ffffff',
  lightGray: '#f7f7f8',
  border: '#e5e5e7'
};

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
  const [animatedMessages, setAnimatedMessages] = useState({});
  const [welcomeScreenFadeOut] = useState(new Animated.Value(1));
  const [isAITyping, setIsAITyping] = useState(false);
  const typingDots = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0)
  ]).current;
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

  // Create a ref for the messages animation
  const messageAnimations = useRef({}).current;
  
  // Helper function to create a new animation for a message
  const createMessageAnimation = (messageId) => {
    if (!messageAnimations[messageId]) {
      messageAnimations[messageId] = {
        opacity: new Animated.Value(0),
        translateY: new Animated.Value(20),
        scale: new Animated.Value(0.8)
      };
    }
    return messageAnimations[messageId];
  };
  
  // Helper function to animate a message entrance
  const animateMessage = (messageId, delay = 0) => {
    const animation = messageAnimations[messageId];
    if (animation) {
      Animated.parallel([
        Animated.timing(animation.opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          delay
        }),
        Animated.timing(animation.translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          delay
        }),
        Animated.timing(animation.scale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          delay
        })
      ]).start();
    }
  };

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
      // Spring animation for opening drawer - more fluid and bouncy
      Animated.spring(drawerAnimation, {
        toValue: 1,
        useNativeDriver: Platform.OS !== 'web',
        friction: 8,     // Controls "bounciness" - higher values = less bounce
        tension: 40,     // Controls speed - higher values = more sudden movement
        restDisplacementThreshold: 0.01, // Helps animation settle quickly
        restSpeedThreshold: 0.01,        // Helps animation settle quickly
      }).start();
    } else {
      // Timing animation with easing function for closing drawer
      Animated.timing(drawerAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
        easing: Easing.bezier(0.25, 1, 0.5, 1), // Custom bezier curve for smooth deceleration
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

  // Drawer-specific pan responder for handling swipes when drawer is open
  const drawerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Respond to horizontal movements for drawer
        return Math.abs(gestureState.dx) > 5;
      },
      onPanResponderGrant: () => {
        // Stop any running animations when user starts dragging
        drawerAnimation.stopAnimation();
        drawerAnimation.extractOffset();
      },
      onPanResponderMove: (evt, gestureState) => {
        // Calculate how far to move the drawer based on gesture
        const maxDistance = drawerWidth;
        let newPosition = gestureState.dx;
        
        // If drawer is open, adjust the translation value to start from fully open position
        if (showDrawer) {
          newPosition = Math.min(0, gestureState.dx); // Limit to leftward movement
        } else {
          newPosition = Math.max(0, gestureState.dx); // Limit to rightward movement
          newPosition = Math.min(newPosition, maxDistance); // Don't drag beyond max width
        }
        
        // Set the animation value directly for interactive feel
        if (showDrawer) {
          // If drawer is open, translate from 0 (open) to -drawerWidth (closed)
          const normalizedValue = 1 - Math.abs(newPosition) / maxDistance;
          drawerAnimation.setValue(Math.max(0, normalizedValue));
        } else {
          // If drawer is closed, translate from 0 (closed) to 1 (open)
          const normalizedValue = newPosition / maxDistance;
          drawerAnimation.setValue(normalizedValue);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Remove any offset we added
        drawerAnimation.flattenOffset();
        
        // Determine velocity direction and magnitude
        const velocityThreshold = 0.3;
        const gestureDistance = showDrawer ? -gestureState.dx : gestureState.dx;
        const gesturePercentage = gestureDistance / drawerWidth;
        const velocity = Math.abs(gestureState.vx);
        
        // Decide whether to open or close based on position and velocity
        const shouldOpen = showDrawer 
          ? gestureState.dx > -drawerWidth * 0.4 && velocity < velocityThreshold
          : (gestureState.dx > drawerWidth * 0.4 || velocity > velocityThreshold);
        
        if (shouldOpen !== showDrawer) {
          // State is changing, call toggle function
          toggleDrawer();
        } else {
          // Animate back to current state with spring for smooth finish
          Animated.spring(drawerAnimation, {
            toValue: shouldOpen ? 1 : 0,
            useNativeDriver: Platform.OS !== 'web',
            friction: 8,
            tension: 40,
            restDisplacementThreshold: 0.01,
            restSpeedThreshold: 0.01,
          }).start();
        }
      },
    })
  ).current;

  // Setup pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // For downward swipes when keyboard is open, be more sensitive
        if (keyboardVisible && gestureState.dy > 5) {
          return true;
        }
        // For horizontal swipes to open drawer, be more sensitive
        if (Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
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
        // If this is a clear horizontal swipe and drawer is closed, start interactive animation
        if (!showDrawer && gestureState.dx > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2) {
          // Set animation value proportional to swipe distance (0 to 1)
          const openValue = Math.min(gestureState.dx / drawerWidth, 1);
          drawerAnimation.setValue(openValue);
        }
        
        // Handle keyboard dismiss
        if (keyboardVisible && gestureState.dy > 20) {
          console.log("Downward swipe detected while keyboard open");
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Left to right swipe (open drawer) with velocity check
        if (gestureState.dx > 50 && !showDrawer) {
          toggleDrawer();
        } else if (gestureState.dx > 20 && gestureState.vx > 0.3 && !showDrawer) {
          // Open drawer if swipe was fast enough, even if distance was shorter
          toggleDrawer();
        } else if (!showDrawer && gestureState.dx > 20) {
          // If drawer was partially opened but not enough, animate back closed
          Animated.spring(drawerAnimation, {
            toValue: 0,
            useNativeDriver: Platform.OS !== 'web',
            friction: 8,
            tension: 40,
          }).start();
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

  const translateX = drawerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth, 0],
    // Add extrapolate: 'clamp' to prevent values outside range
    extrapolate: 'clamp',
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

  // Add a function to animate the typing dots
  const animateTypingDots = () => {
    // Reset values
    typingDots.forEach(dot => dot.setValue(0));
    
    // Sequence of animations for each dot
    const animations = typingDots.map((dot, i) => {
      return Animated.sequence([
        Animated.delay(i * 200), // Stagger the start time
        Animated.timing(dot, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(dot, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        })
      ]);
    });
    
    // Run the animation in a loop as long as typing is true
    const loopAnimation = Animated.loop(
      Animated.stagger(100, animations)
    );
    
    loopAnimation.start();
    
    return loopAnimation;
  };
  
  // Typing Indicator Component
  const TypingIndicator = () => {
    // Start animation when component mounts
    useEffect(() => {
      const animation = animateTypingDots();
      return () => animation.stop();
    }, []);
    
    return (
      <View style={styles.typingIndicator}>
        <View style={styles.typingAvatar}>
          <Ionicons name="chatbubble-ellipses" size={16} color="#3b82f6" />
        </View>
        <View style={styles.typingDots}>
          {typingDots.map((dot, index) => (
            <Animated.View 
              key={index} 
              style={[
                styles.typingDot,
                {
                  opacity: dot,
                  transform: [{
                    translateY: dot.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -5]
                    })
                  }]
                }
              ]} 
            />
          ))}
        </View>
      </View>
    );
  };

  // Modify the sendMessage function to show typing indicator
  const sendMessage = () => {
    if (inputText.trim()) {
      // Add user message
      const userMessageId = Date.now().toString();
      const userMessage = {
        id: userMessageId,
        text: inputText,
        isUser: true,
      };
      
      // Create animation for user message
      createMessageAnimation(userMessageId);
      
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
      
      // Start animation for user message immediately
      setTimeout(() => animateMessage(userMessageId), 50);
      
      setInputText('');
      
      // Show typing indicator
      setIsAITyping(true);
      
      // Add AI response after a short delay to simulate thinking
      setTimeout(() => {
        // Hide typing indicator before adding the AI message
        setIsAITyping(false);
        
        // If this is the first message, send a welcome message
        const aiMessageId = (Date.now() + 1).toString();
        const aiMessage = {
          id: aiMessageId,
          text: isFirstMessage 
            ? "Hello! I'm your friendly chatbot assistant. How can I help you today?" 
            : getRandomResponse(),
          isUser: false,
        };
        
        // Create animation for AI message
        createMessageAnimation(aiMessageId);
        
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
          
          // Start animation for AI message after a slight delay
          setTimeout(() => animateMessage(aiMessageId), 50);
          
          return newSessions;
        });
      }, 1500); // Slightly longer delay to make typing indicator visible
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
    
    // Update state
    setShowDrawer(!showDrawer);
    
    // The animation is already handled by useEffect based on the showDrawer state
    // The animation is now more responsive because it reacts to the state change
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
              <Image source={require('./assets/video_icon.png')} style={styles.voiceIcon} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.voiceButton} activeOpacity={0.7}>
              <Image source={require('./assets/call_icon.png')} style={styles.voiceIcon} />
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

  // Update EmptyChatScreen component's handleSubmit to show typing indicator too
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
        const userMessageId = Date.now().toString();
        const userMessage = {
          id: userMessageId,
          text: messageText,
          isUser: true,
        };
        
        // Create animation for user message
        createMessageAnimation(userMessageId);
        
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
        
        // Start animation for user message
        setTimeout(() => animateMessage(userMessageId), 50);
        
        // Show typing indicator
        setIsAITyping(true);
        
        // Add AI response after a short delay to simulate thinking
        setTimeout(() => {
          // Hide typing indicator before adding the AI message
          setIsAITyping(false);
          
          const aiMessageId = (Date.now() + 1).toString();
          const aiMessage = {
            id: aiMessageId,
            text: isFirstMessage 
              ? "Hello! I'm your friendly chatbot assistant. How can I help you today?" 
              : getRandomResponse(),
            isUser: false,
          };
          
          // Create animation for AI message
          createMessageAnimation(aiMessageId);
          
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
            
            // Start animation for AI message
            setTimeout(() => animateMessage(aiMessageId), 50);
            
            return newSessions;
          });
        }, 1500); // Longer delay to make typing indicator visible
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
          <Ionicons name="menu" size={24} color={BUBL_COLORS.mediumBlue} />
        </TouchableOpacity>
        
        {/* Logo at the top of the empty chat screen */}
        <View style={styles.welcomeLogoTopContainer}>
          <Image 
            source={require('./assets/BublChat_logo_MAIN.png')} 
            style={styles.welcomeTopLogo}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.welcomeContainer}>
          <View style={styles.welcomeLogoContainer}>
            <Ionicons name="chatbubble-ellipses" size={60} color={BUBL_COLORS.mediumBlue} />
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
                <Image source={require('./assets/send_icon.png')} style={styles.welcomeIcon} />
              ) : (
                <Image source={require('./assets/call_icon.png')} style={styles.welcomeIcon} />
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
        {/* Only show overlay on non-web platforms when drawer is open */}
        {showDrawer && Platform.OS !== 'web' && (
          <TouchableOpacity 
            style={{ width: '100%', height: '100%', position: 'absolute', left: 0, top: 0, zIndex: 1 }}
            activeOpacity={1} 
            onPress={toggleDrawer}
            {...drawerPanResponder.panHandlers}
          />
        )}
        <Animated.View 
          style={[
            styles.drawer,
            {
              transform: [{ 
                translateX: drawerAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-drawerWidth, 0],
                  extrapolate: 'clamp',
                }) 
              }],
              width: drawerWidth,
              // Add shadow props for native platforms
              shadowColor: "#000",
              shadowOffset: { width: 5, height: 0 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 10,
            }
          ]}
          {...drawerPanResponder.panHandlers}
        >
          <SafeAreaView style={styles.drawerContent}>
            {/* Bubl Logo Header */}
            <View style={styles.drawerHeader}>
              <View style={styles.logoContainer}>
                <Image source={require('./assets/BublChat_logo.png')} style={styles.logo} />
              </View>
            </View>
            
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={22} color={BUBL_COLORS.mediumBlue} style={styles.searchIcon} />
                <Text style={styles.searchPlaceholder}>Search</Text>
              </View>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={createNewChat}
                accessibilityLabel="Create new chat"
                accessibilityRole="button"
              >
                <Ionicons name="add" size={28} color={BUBL_COLORS.mediumBlue} />
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
                        <Ionicons name="chatbubble-ellipses-outline" size={22} color={BUBL_COLORS.mediumBlue} />
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
    // and animate the welcome screen out
    if (messages.length === 1) {
      // Animate welcome screen out
      Animated.timing(welcomeScreenFadeOut, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Animate header in
      Animated.timing(headerAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [messages.length]);

  // Replace the message rendering inside FlatList renderItem
  const renderMessage = ({ item, index }) => {
    // Create animation if it doesn't exist
    if (!messageAnimations[item.id]) {
      createMessageAnimation(item.id);
      // Stagger animation based on index for initial load
      setTimeout(() => animateMessage(item.id, index * 50), 50);
    }
    
    const animation = messageAnimations[item.id];
    
    // Check if this message is part of a consecutive series from same sender
    const isConsecutive = index > 0 && messages[index - 1].isUser === item.isUser;
    
    return (
      <Animated.View 
        style={[
          styles.messageBubble,
          item.isUser ? styles.userMessage : styles.aiMessage,
          { 
            maxWidth: width * 0.75,
            marginTop: isConsecutive ? 2 : 8, // Reduce margin for consecutive messages
          },
          {
            opacity: animation.opacity,
            transform: [
              { translateY: animation.translateY },
              { scale: animation.scale }
            ]
          }
        ]}
      >
        <Text style={[
          styles.messageText,
          item.isUser ? styles.userMessageText : styles.aiMessageText
        ]}>{item.text}</Text>
      </Animated.View>
    );
  };

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
                  <Animated.View style={{ flex: 1, opacity: welcomeScreenFadeOut }}>
                    <EmptyChatScreen chatTitle={currentTitle} />
                  </Animated.View>
                ) : (
                  <>
                    <FlatList
                      ref={flatListRef}
                      style={styles.chatList}
                      data={messages}
                      renderItem={renderMessage}
                      keyExtractor={item => item.id}
                      contentContainerStyle={[
                        styles.chatContent,
                        isAITyping && { paddingBottom: 50 } // Add space for typing indicator
                      ]}
                      onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                      onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                      showsVerticalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                    />
                    
                    {/* Typing indicator */}
                    {isAITyping && (
                      <View style={styles.typingIndicatorContainer}>
                        <TypingIndicator />
                      </View>
                    )}
                  </>
                )}
              </View>
              
              {/* Input bar - floating style */}
              {messages.length > 0 && (
                <View style={styles.inputContainerWrapper}>
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
                        <Image source={require('./assets/send_icon.png')} style={styles.icon} />
                      ) : (
                        <Image source={require('./assets/call_icon.png')} style={styles.icon} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              
              {/* Voice Chat Modal */}
              <VoiceChatModal />
            </View>
            
            {/* Web-specific overlay - only include touchable area without background dimming */}
            {Platform.OS === 'web' && showDrawer && (
              <TouchableOpacity 
                style={{
                  position: 'absolute',
                  width: '100%', 
                  height: '100%',
                  zIndex: 5,
                  backgroundColor: 'transparent'
                }}
                activeOpacity={1}
                onPress={toggleDrawer}
              />
            )}
            
            {/* Drawer - web version */}
            {Platform.OS === 'web' && (
              <View 
                style={[
                  styles.webDrawer, 
                  { 
                    width: drawerWidth,
                    transform: showDrawer ? 
                      [{translateX: '0%'}] : 
                      [{translateX: '-100%'}],
                    boxShadow: showDrawer ? 
                      '0px 0px 20px rgba(0, 0, 0, 0.25)' : 
                      '0px 0px 0px rgba(0, 0, 0, 0)'
                  }
                ]}
              >
                <SafeAreaView style={styles.drawerContent}>
                  {/* Bubl Logo Header */}
                  <View style={styles.drawerHeader}>
                    <View style={styles.logoContainer}>
                      <Image source={require('./assets/BublChat_logo.png')} style={styles.logo} />
                    </View>
                  </View>
                  
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
                <Animated.View style={{ flex: 1, opacity: welcomeScreenFadeOut }}>
                  <EmptyChatScreen chatTitle={currentTitle} />
                </Animated.View>
              ) : (
                <>
                  <FlatList
                    ref={flatListRef}
                    style={styles.chatList}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id}
                    contentContainerStyle={[
                      styles.chatContent,
                      isAITyping && { paddingBottom: 50 } // Add space for typing indicator
                    ]}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  />
                  
                  {/* Typing indicator */}
                  {isAITyping && (
                    <View style={styles.typingIndicatorContainer}>
                      <TypingIndicator />
                    </View>
                  )}
                </>
              )}
        </View>
        
            {/* Input bar - floating style */}
            {messages.length > 0 && (
              <View style={styles.inputContainerWrapper}>
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
                      <Image source={require('./assets/send_icon.png')} style={styles.icon} />
                    ) : (
                      <Image source={require('./assets/call_icon.png')} style={styles.icon} />
                    )}
                  </TouchableOpacity>
                </View>
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
                      extrapolate: 'clamp',
                    }) 
                  }],
                  width: drawerWidth
                }
              ]}
            >
              <SafeAreaView style={styles.drawerContent}>
                {/* Bubl Logo Header */}
                <View style={styles.drawerHeader}>
                  <View style={styles.logoContainer}>
                    <Image source={require('./assets/BublChat_logo.png')} style={styles.logo} />
                  </View>
                </View>
                
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                  <View style={styles.searchBar}>
                    <Ionicons name="search" size={22} color={BUBL_COLORS.mediumBlue} style={styles.searchIcon} />
                    <Text style={styles.searchPlaceholder}>Search</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.createButton}
                    onPress={createNewChat}
                    accessibilityLabel="Create new chat"
                    accessibilityRole="button"
                  >
                    <Ionicons name="add" size={28} color={BUBL_COLORS.mediumBlue} />
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
                            <Ionicons name="chatbubble-ellipses-outline" size={22} color={BUBL_COLORS.mediumBlue} />
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
            
            {/* Overlay when drawer is open - transparent */}
            {showDrawer && (
              <TouchableOpacity
                style={{ 
                  position: 'absolute',
                  width: '100%', 
                  height: '100%',
                  zIndex: 1,
                  backgroundColor: 'transparent'
                }}
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
    backgroundColor: BUBL_COLORS.mediumBlue,
  },
  container: {
    flex: 1,
    backgroundColor: BUBL_COLORS.white,
  },
  headerContainer: {
    backgroundColor: BUBL_COLORS.mediumBlue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    paddingTop: Platform.OS === 'ios' ? 10 : 50,
    borderBottomWidth: 1,
    borderBottomColor: BUBL_COLORS.lightBlue,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: BUBL_COLORS.white,
  },
  chatList: {
    flex: 1,
    width: '100%',
    backgroundColor: BUBL_COLORS.white,
  },
  chatContent: {
    paddingBottom: 100,
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  messageBubble: {
    padding: 14,
    borderRadius: 18,
    marginVertical: 8,
    minHeight: 40,
    justifyContent: 'center',
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: BUBL_COLORS.mediumBlue,
    borderRadius: 18,
    marginVertical: 4,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: BUBL_COLORS.lightBlue,
    borderRadius: 18,
    marginVertical: 4,
  },
  userMessageText: {
    color: BUBL_COLORS.white,
    fontSize: 16,
    lineHeight: 22,
  },
  aiMessageText: {
    color: '#000',
    fontSize: 16,
    lineHeight: 22,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  inputContainerWrapper: {
    width: '100%',
    position: 'relative',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    marginBottom: 0,
    backgroundColor: 'transparent',
  },
  inputContainer: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    padding: 16,
    paddingVertical: 16,
    backgroundColor: '#f9f9fa',
    borderRadius: 30,
    // Add elevation/shadow to make it float
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.08)',
    } : {}),
  },
  input: {
    flex: 1,
    borderWidth: 0, // Remove border
    padding: 14,
    paddingVertical: 14,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f9f9fa',
    fontSize: 16, // Larger font size
    minHeight: 50, // Taller input
    // The outline property isn't supported in React Native
    // Only apply it when on web platform
    ...(Platform.OS === 'web' ? {
      outlineWidth: 0,
      outlineStyle: 'none'
    } : {}),
  },
  sendButton: {
    backgroundColor: BUBL_COLORS.mediumBlue,
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: BUBL_COLORS.mediumBlue,
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
    backgroundColor: 'rgba(0, 0, 0, 0)',
    zIndex: 1,
  },
  drawer: {
    position: 'absolute',
    height: '100%',
    backgroundColor: BUBL_COLORS.white,
    zIndex: 2,
  },
  drawerContent: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  drawerHeader: {
    backgroundColor: BUBL_COLORS.lightBlue,
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  logoContainer: {
    width: 360,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BUBL_COLORS.border,
    backgroundColor: BUBL_COLORS.lightBlue,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BUBL_COLORS.white,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  searchIcon: {
    marginRight: 8,
    color: BUBL_COLORS.mediumBlue,
  },
  searchPlaceholder: {
    color: '#888',
    fontSize: 16,
  },
  createButton: {
    backgroundColor: BUBL_COLORS.white,
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
    borderTopColor: BUBL_COLORS.border,
    backgroundColor: BUBL_COLORS.white,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BUBL_COLORS.mediumBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInitial: {
    color: BUBL_COLORS.white,
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
    backgroundColor: `rgba(${parseInt(BUBL_COLORS.mediumBlue.slice(1, 3), 16)}, ${parseInt(BUBL_COLORS.mediumBlue.slice(3, 5), 16)}, ${parseInt(BUBL_COLORS.mediumBlue.slice(5, 7), 16)}, 0.9)`,
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
    backgroundColor: BUBL_COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: BUBL_COLORS.border,
  },
  chatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: BUBL_COLORS.white,
  },
  activeChatItem: {
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 4,
    borderLeftColor: BUBL_COLORS.mediumBlue,
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
    color: BUBL_COLORS.mediumBlue,
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
    color: BUBL_COLORS.white,
    minWidth: 120,
    textAlign: 'center',
    padding: 0,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 255, 255, 0.5)',
    ...(Platform.OS === 'web' ? {
      outlineWidth: 0,
      outlineStyle: 'none'
    } : {}),
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
    backgroundColor: BUBL_COLORS.white,
  },
  welcomeLogoTopContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 100,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 400,
  },
  welcomeTopLogo: {
    width: 280,
    height: 100,
  },
  welcomeContainer: {
    backgroundColor: BUBL_COLORS.white,
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
  welcomeLogoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: BUBL_COLORS.lightBlue,
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: BUBL_COLORS.white,
    borderRadius: 30,
    // Add elevation/shadow to make it float
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.08)',
    } : {}),
  },
  welcomeInput: {
    flex: 1,
    borderWidth: 0, // Remove border
    padding: 14,
    paddingVertical: 14,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f9f9fa', // Slightly different background color
    fontSize: 16, // Larger font size
    minHeight: 50, // Taller input
    ...(Platform.OS === 'web' ? {
      outlineWidth: 0,
      outlineStyle: 'none'
    } : {}),
  },
  welcomeSendButton: {
    backgroundColor: BUBL_COLORS.mediumBlue,
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // New styles for empty screen
  safeAreaNoHeader: {
    backgroundColor: BUBL_COLORS.white,
  },
  emptyScreenMenuButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 20 : 50,
    left: 15,
    zIndex: 10,
    padding: 10,
    borderRadius: 20,
    backgroundColor: BUBL_COLORS.white,
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
    backgroundColor: BUBL_COLORS.white,
    transition: 'margin 0.35s cubic-bezier(0.16, 1, 0.3, 1), width 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  webOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0)',
    zIndex: 5,
    transition: 'opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  webDrawer: {
    backgroundColor: BUBL_COLORS.white,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 10,
    transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease',
  },
  // Add typing indicator styles
  typingIndicatorContainer: {
    position: 'absolute',
    bottom: 10,
    left: 15,
    zIndex: 1,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BUBL_COLORS.lightBlue,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    maxWidth: 100,
  },
  typingAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BUBL_COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BUBL_COLORS.mediumBlue,
    marginHorizontal: 2,
  },
  // Icon styles
  icon: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  // Slightly larger icon for the welcome screen buttons
  welcomeIcon: {
    width: 42,
    height: 42,
    resizeMode: 'contain',
  },
  // Icon for the voice chat modal
  voiceIcon: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
});
