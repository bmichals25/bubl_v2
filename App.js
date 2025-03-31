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
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const drawerAnimation = useRef(new Animated.Value(0)).current;
  const dismissButtonAnimation = useRef(new Animated.Value(0)).current;
  const { width, height } = Dimensions.get('window');
  
  const drawerWidth = width * 0.75;

  // Control drawer animation
  useEffect(() => {
    if (showDrawer) {
      Animated.timing(drawerAnimation, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(drawerAnimation, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
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

  // Add welcome message when app loads
  useEffect(() => {
    const welcomeMessage = {
      id: 'welcome',
      text: "Hello! I'm your friendly chatbot assistant. How can I help you today?",
      isUser: false,
    };
    setMessages([welcomeMessage]);
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
      
      setMessages(prevMessages => [...prevMessages, userMessage]);
      setInputText('');
      
      // Add AI response after a short delay to simulate thinking
      setTimeout(() => {
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          text: getRandomResponse(),
          isUser: false,
        };
        setMessages(prevMessages => {
          const newMessages = [...prevMessages, aiMessage];
          // Scroll to the latest message in the next render cycle
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          return newMessages;
        });
      }, 1000);
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

  // Drawer Component
  const DrawerMenu = () => {
    return (
      <>
        {showDrawer && (
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
            { transform: [{ translateX }], width: drawerWidth }
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
              <TouchableOpacity style={styles.createButton}>
                <Ionicons name="create-outline" size={28} color="#3b82f6" />
              </TouchableOpacity>
            </View>
            
            {/* Empty space where content was removed */}
            <View style={styles.emptySpace} />
            
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.menuButton} 
            onPress={toggleDrawer}
            accessibilityLabel="Open menu"
            accessibilityRole="button"
          >
            <Ionicons name="menu" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.header}>BublChat</Text>
          <View style={styles.menuSpacer} />
        </View>
        
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
        </View>
        
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
        
        {/* Voice Chat Modal */}
        <VoiceChatModal />
        
        {/* Side Drawer */}
        <DrawerMenu />
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
});
