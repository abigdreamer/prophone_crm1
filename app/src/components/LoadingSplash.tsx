import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

export default function LoadingSplash() {
  const { C } = useAppTheme();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 0.72,
      duration: 2800,
      useNativeDriver: false,
    }).start();
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: '#08080f' }]}>
      {/* Logo */}
      <View style={[styles.logoWrap, { backgroundColor: C.primary }]}>
        <View style={[styles.logoInner, { backgroundColor: `${C.primary}cc` }]}>
          <Text style={styles.logoLetter}>G</Text>
        </View>
      </View>

      {/* Brand name */}
      <Text style={styles.brandName}>GeniusAI</Text>
      <Text style={styles.appName}>PROPHONE CRM</Text>

      {/* Spinner + label */}
      <View style={styles.spinnerWrap}>
        <SpinnerRing color={C.primary} />
        <Text style={[styles.loadingText, { color: C.textMuted }]}>Loading CRM data...</Text>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: C.cardBorder }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: C.primary,
              width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
      </View>
    </View>
  );
}

function SpinnerRing({ color }: { color: string }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={[styles.ring, { borderTopColor: color, transform: [{ rotate }] }]} />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },

  logoWrap: {
    width: 90,
    height: 90,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  logoInner: {
    width: 66,
    height: 66,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
  },

  brandName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  appName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4a5568',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 48,
  },

  spinnerWrap: {
    alignItems: 'center',
    gap: 16,
    marginBottom: 48,
  },
  ring: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#1e1e2e',
    borderTopColor: '#6366f1',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },

  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
});
