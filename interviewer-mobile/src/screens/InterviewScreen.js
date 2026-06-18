import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/theme';
import TranscriptItem from '../components/TranscriptItem';
import { useInterviewManager } from '../hooks/useInterviewManager';

export default function InterviewScreen() {
  const { 
    transcript, 
    isConnected, 
    isRecording, 
    startRecording, 
    stopRecording, 
    removePair,
    clearHistory,
    logout
  } = useInterviewManager();
  
  const theme = colors.light; // using light theme

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.title, { color: theme.primary }]}>Interview Session</Text>
          <View style={[styles.statusIndicator, { backgroundColor: isConnected ? 'green' : 'red', marginLeft: 8 }]} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={clearHistory} style={{ marginRight: 16 }}>
            <Text style={{ color: theme.primary, fontWeight: 'bold' }}>New Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout}>
            <Text style={{ color: theme.destructive, fontWeight: 'bold' }}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={transcript}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TranscriptItem item={item} onRemove={() => removePair(item.dbId)} />
        )}
        contentContainerStyle={styles.listContent}
      />

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <TouchableOpacity 
          style={[styles.recordButton, { backgroundColor: isRecording ? theme.destructive : theme.primary }]}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <Text style={{ color: theme.primaryForeground, fontWeight: 'bold' }}>
            {isRecording ? 'Stop Answering' : 'Tap to Answer'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.md,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  listContent: {
    padding: spacing.md,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
  },
  recordButton: {
    padding: spacing.md,
    borderRadius: spacing.radius,
    alignItems: 'center',
  },
});
