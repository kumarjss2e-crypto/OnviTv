import React, { useState, useCallback, useRef } from 'react';
import { View, ScrollView, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import Colors from '../theme/colors';
import { parseM3UIncremental } from '../utils/incrementalM3UParser';

export default function IncrementalParserTestModal() {
  const [url, setUrl] = useState('https://iptv-org.github.io/iptv/index.m3u');
  const [isLoading, setIsLoading] = useState(false);
  const [channels, setChannels] = useState([]);
  const [progress, setProgress] = useState(null);
  const [logs, setLogs] = useState([]);
  const abortControllerRef = useRef(null);

  const addLog = useCallback((message) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    console.log(message);
  }, []);

  const handleTest = async () => {
    if (!url.trim()) {
      addLog('❌ Enter a valid M3U URL');
      return;
    }

    setIsLoading(true);
    setChannels([]);
    setLogs([]);
    setProgress(null);
    abortControllerRef.current = new AbortController();

    addLog(`🔄 Starting incremental parse test: ${url}`);

    try {
      const result = await parseM3UIncremental(
        url,
        (channel) => {
          setChannels((prev) => [...prev, channel]);
          if (channels.length % 50 === 0) {
            addLog(`✓ Parsed ${channels.length} channels`);
          }
        },
        (prog) => {
          setProgress(prog);
          if (prog.complete) {
            addLog(`✓ Complete: ${prog.channelsFound} total channels`);
          }
        },
        abortControllerRef.current.signal
      );

      addLog(`✓ Success: ${result.channelsFound} channels found`);
      setIsLoading(false);
    } catch (error) {
      addLog(`❌ Error: ${error.message}`);
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      addLog('⚠️ Parse cancelled');
      setIsLoading(false);
    }
  };

  const handleCopyLogs = () => {
    const logText = logs.join('\n');
    // For web, we'd use clipboard API, for native we need different handling
    console.log('Copying logs:', logText);
    if (typeof window !== 'undefined' && navigator?.clipboard) {
      navigator.clipboard.writeText(logText).then(() => {
        addLog('✓ Logs copied to clipboard');
      });
    } else {
      addLog('📋 Logs (copy from console):\n' + logText);
    }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 16, backgroundColor: Colors.background.primary }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 12 }}>
        Incremental M3U Parser Test
      </Text>

      <Text style={{ color: Colors.text.secondary, marginBottom: 8, fontSize: 12 }}>
        This tests the NEW incremental streaming parser that shows channels as they download (not after full download)
      </Text>

      <TextInput
        placeholder="Enter M3U URL"
        placeholderTextColor={Colors.text.tertiary}
        value={url}
        onChangeText={setUrl}
        style={{
          borderWidth: 1,
          borderColor: Colors.border.primary,
          borderRadius: 8,
          padding: 12,
          color: Colors.text.primary,
          backgroundColor: Colors.input.background,
          marginBottom: 12,
          fontFamily: 'monospace',
          fontSize: 11,
        }}
        editable={!isLoading}
      />

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <Pressable
          onPress={handleTest}
          disabled={isLoading}
          style={{
            flex: 1,
            backgroundColor: isLoading ? Colors.disabled : Colors.accent.primary,
            paddingVertical: 10,
            borderRadius: 8,
            alignItems: 'center',
          }}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Start Parse</Text>
          )}
        </Pressable>

        {isLoading && (
          <Pressable
            onPress={handleCancel}
            style={{
              paddingHorizontal: 16,
              backgroundColor: Colors.error?.primary || '#ff4444',
              borderRadius: 8,
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Cancel</Text>
          </Pressable>
        )}

        <Pressable
          onPress={handleCopyLogs}
          style={{
            paddingHorizontal: 16,
            backgroundColor: Colors.border.primary,
            borderRadius: 8,
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: Colors.text.primary, fontWeight: 'bold' }}>Copy Logs</Text>
        </Pressable>
      </View>

      {/* Progress Display */}
      {progress && (
        <View
          style={{
            backgroundColor: Colors.surface.secondary,
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            borderColor: Colors.border.primary,
            borderWidth: 1,
          }}
        >
          <Text style={{ color: Colors.text.primary, fontSize: 12, marginBottom: 8 }}>
            📊 Progress
          </Text>
          <Text style={{ color: Colors.text.secondary, fontSize: 11 }}>
            Channels: {progress.channelsFound} | Downloaded: {(progress.bytesReceived / 1024).toFixed(1)}KB /{' '}
            {(progress.totalBytes / 1024).toFixed(1)}KB | {progress.percentDownloaded}%
          </Text>
          {progress.complete && (
            <Text style={{ color: Colors.success?.primary || '#44ff44', fontSize: 11, marginTop: 4 }}>
              ✓ Complete
            </Text>
          )}
        </View>
      )}

      {/* Channels Display */}
      {channels.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: Colors.text.primary, fontSize: 12, marginBottom: 8 }}>
            📺 Found {channels.length} Channels
          </Text>
          {channels.slice(0, 10).map((channel, index) => (
            <View
              key={index}
              style={{
                backgroundColor: Colors.surface.secondary,
                borderRadius: 6,
                padding: 8,
                marginBottom: 8,
                borderLeftWidth: 3,
                borderLeftColor: Colors.accent.primary,
              }}
            >
              <Text style={{ color: Colors.text.primary, fontSize: 11, fontWeight: 'bold' }}>
                {channel.name}
              </Text>
              <Text style={{ color: Colors.text.tertiary, fontSize: 10 }}>
                Group: {channel.group} | ID: {channel.id}
              </Text>
            </View>
          ))}
          {channels.length > 10 && (
            <Text style={{ color: Colors.text.secondary, fontSize: 11 }}>... and {channels.length - 10} more</Text>
          )}
        </View>
      )}

      {/* Logs */}
      <View
        style={{
          backgroundColor: Colors.surface.secondary,
          borderRadius: 8,
          padding: 12,
          borderColor: Colors.border.primary,
          borderWidth: 1,
        }}
      >
        <Text style={{ color: Colors.text.primary, fontSize: 12, marginBottom: 8, fontWeight: 'bold' }}>
          📋 Logs
        </Text>
        <ScrollView
          style={{
            maxHeight: 200,
            backgroundColor: Colors.background.primary,
            borderRadius: 6,
            padding: 8,
          }}
        >
          {logs.length === 0 ? (
            <Text style={{ color: Colors.text.tertiary, fontSize: 10 }}>No logs yet...</Text>
          ) : (
            logs.map((log, index) => (
              <Text key={index} style={{ color: Colors.text.secondary, fontSize: 9, fontFamily: 'monospace' }}>
                {log}
              </Text>
            ))
          )}
        </ScrollView>
      </View>

      {/* Instructions */}
      <View style={{ marginTop: 16, backgroundColor: Colors.surface.tertiary, borderRadius: 8, padding: 12 }}>
        <Text style={{ color: Colors.text.primary, fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>
          💡 How it works:
        </Text>
        <Text style={{ color: Colors.text.secondary, fontSize: 10, lineHeight: 16 }}>
          • Uses XMLHttpRequest progress events{'\n'}
          • Parses lines as they arrive (no wait for full download){'\n'}
          • Shows channels instantly - 2-3 seconds vs 40-60 seconds{'\n'}
          • Works by buffering bytes until newline, then parsing{'\n'}
          • Can handle very large M3U files{'\n'}
          • Shows percentage progress while downloading
        </Text>
      </View>
    </ScrollView>
  );
}
