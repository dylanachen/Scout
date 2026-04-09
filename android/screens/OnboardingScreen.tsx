import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

/* ── Step definitions (mirroring the web onboardingFlows) ──────── */

type InputType = 'text' | 'numeric' | 'decimal' | 'chips' | 'multiselect' | 'tools';

interface OnboardingStep {
  id: string;
  assistantText: string;
  inputType: InputType;
  chips?: string[];
  optional?: boolean;
  placeholder?: string;
  conditionalOn?: string;
  conditionalChips?: Record<string, string[]>;
  conditionalText?: Record<string, string>;
  skipIf?: Record<string, string>;
  showIf?: string[];
  followUp?: { trigger: string; text: string };
  datePickerChip?: string;
}

const FREELANCER_STEPS: OnboardingStep[] = [
  { id: 'welcome', assistantText: "Hey {{firstName}} \u{1F44B} I'm your FreelanceOS AI. I'm going to ask you a few quick questions so we can build your profile and find you the right clients. It'll take about 3 minutes. Ready?", inputType: 'chips', chips: ["Let's go", 'Sure'] },
  { id: 'specialty', assistantText: 'What type of freelance work do you do?', inputType: 'tools', chips: ['UI/UX Design', 'Web Development', 'Video Editing', 'Copywriting & Content', 'Branding & Graphic Design', 'Consulting', 'Photography', 'Motion Graphics', 'Other'], placeholder: 'Tell me what you do' },
  { id: 'tools', assistantText: 'Nice! What tools do you use most in your work?', inputType: 'tools', conditionalOn: 'specialty', conditionalChips: { 'UI/UX Design': ['Figma', 'Adobe XD', 'Sketch', 'Framer', 'Webflow', 'Other'], 'Web Development': ['React', 'Vue', 'Node', 'Python', 'Flutter', 'Other'], 'Video Editing': ['Premiere Pro', 'Final Cut', 'DaVinci Resolve', 'After Effects', 'CapCut', 'Other'], 'Copywriting & Content': ['Google Docs', 'Notion', 'WordPress', 'Substack', 'Other'] }, chips: ['Figma', 'Adobe XD', 'Sketch', 'Framer', 'Webflow', 'React', 'Vue', 'Node', 'Python', 'Premiere Pro', 'Final Cut', 'Google Docs', 'Notion', 'Other'], placeholder: 'Add a tool' },
  { id: 'experience', assistantText: 'How long have you been freelancing?', inputType: 'chips', chips: ['Less than 1 year', '1\u20133 years', '3\u20135 years', '5\u201310 years', '10+ years'] },
  { id: 'project_length', assistantText: "What's your typical project length?", inputType: 'chips', chips: ['Under 1 week', '1\u20134 weeks', '1\u20133 months', '3+ months', 'It varies'] },
  { id: 'comm_style', assistantText: 'How do you like to communicate with clients?', inputType: 'chips', chips: ['Real-time (calls, Slack, DMs)', 'Async (email, recorded updates)', 'Mix of both'] },
  { id: 'rate_structure', assistantText: "What's your target rate?", inputType: 'chips', chips: ['Hourly', 'Per project', 'Retainer', 'It depends'] },
  { id: 'rate_amount', assistantText: "What's your rate? $", inputType: 'decimal', optional: true, placeholder: 'Amount in USD', conditionalOn: 'rate_structure', conditionalText: { Hourly: "What's your hourly rate? $", 'Per project': "What's a typical project budget for you? $", Retainer: "What's your typical monthly retainer? $" }, skipIf: { rate_structure: 'It depends' } },
  { id: 'availability', assistantText: 'Are you currently available to take on new projects?', inputType: 'chips', chips: ['Yes, immediately', 'Yes, starting\u2026', 'No, just browsing for now'], datePickerChip: 'Yes, starting\u2026' },
  { id: 'frustration', assistantText: "Last one \u2014 what's been your biggest frustration working with clients?", inputType: 'text', placeholder: 'E.g. late payments, scope creep, unclear feedback...' },
];

const CLIENT_STEPS: OnboardingStep[] = [
  { id: 'welcome', assistantText: "Hey {{firstName}} \u{1F44B} I'm your FreelanceOS AI. Let's figure out exactly what you need so I can match you with the right freelancer. This takes about 3 minutes. Ready?", inputType: 'chips', chips: ["Let's go", 'Sure'] },
  { id: 'brief_seed', assistantText: 'Tell me about your project. What do you need help with?', inputType: 'text', placeholder: 'E.g. I need a brand identity designed for my new startup' },
  { id: 'freelancer_type', assistantText: 'Got it. What type of freelancer are you looking for?', inputType: 'tools', chips: ['UI/UX Designer', 'Web Developer', 'Video Editor', 'Copywriter', 'Brand Designer', 'Consultant', 'Photographer', 'Motion Designer', 'Not sure \u2014 recommend one'], placeholder: 'Tell me what you need' },
  { id: 'timeline', assistantText: 'When do you need this done by?', inputType: 'chips', chips: ['ASAP (under 1 week)', '2\u20134 weeks', '1\u20133 months', '3+ months', 'Flexible'] },
  { id: 'budget', assistantText: "What's your budget for this project?", inputType: 'chips', chips: ['Under $500', '$500\u2013$2,000', '$2,000\u2013$5,000', '$5,000\u2013$10,000', '$10,000+', 'Not sure yet'] },
  { id: 'comm_pref', assistantText: 'How do you prefer to communicate during a project?', inputType: 'chips', chips: ['Real-time (calls and DMs)', 'Async (email and updates)', 'Mix of both'] },
  { id: 'decision_maker', assistantText: 'Who makes the final call on approvals and deliverables?', inputType: 'chips', chips: ['Just me', 'Me and a partner', "I'll need to loop in a team", "There's a separate decision maker above me"], followUp: { trigger: "There's a separate decision maker above me", text: "Good to know \u2014 we'll make sure your freelancer knows to loop them in at key moments." } },
  { id: 'past_experience', assistantText: 'Have you worked with freelancers before?', inputType: 'chips', chips: ['Yes, many times', 'A few times', 'No, this is my first time'] },
  { id: 'past_detail', assistantText: 'What went well or badly in past projects?', inputType: 'text', optional: true, placeholder: 'Share your experience or skip this one', conditionalOn: 'past_experience', showIf: ['Yes, many times', 'A few times'], chips: ['Skip'] },
  { id: 'success', assistantText: 'Last one \u2014 what does a successful outcome look like for you?', inputType: 'text', placeholder: 'E.g. A finished brand kit I can use across all our channels by launch day' },
];

/* ── Typing indicator (animated dots) ──────────────────── */

function TypingIndicator() {
  const anims = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const runners = anims.map((a, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(a, { toValue: -6, duration: 250, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.delay(400 - i * 160),
        ]),
      ),
    );
    runners.forEach((r) => r.start());
    return () => runners.forEach((r) => r.stop());
  }, []);

  return (
    <View style={styles.typingWrap}>
      <View style={styles.aiAvatarSmall}>
        <Text style={styles.aiAvatarText}>AI</Text>
      </View>
      <View style={styles.typingBubble}>
        {anims.map((a, i) => (
          <Animated.View key={i} style={[styles.typingDot, { transform: [{ translateY: a }] }]} />
        ))}
      </View>
    </View>
  );
}

/* ── Onboarding screen ─────────────────────────────────── */

type ChatMsg = { role: 'assistant' | 'user'; text: string };
type Phase = 'typing' | 'waiting' | 'done';

type Props = {
  navigation: any;
  onComplete: (role?: string) => Promise<void>;
};

export default function OnboardingScreen({ navigation, onComplete }: Props) {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'there';
  const userRole = user?.role || 'freelancer';
  const steps = userRole === 'client' ? CLIENT_STEPS : FREELANCER_STEPS;

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('typing');
  const [input, setInput] = useState('');
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const answers = useRef<Record<string, string>>({});

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const shouldSkipStep = useCallback((step: OnboardingStep): boolean => {
    if (step.skipIf) {
      for (const [k, v] of Object.entries(step.skipIf)) {
        if (answers.current[k] === v) return true;
      }
    }
    if (step.showIf && step.conditionalOn) {
      const prev = answers.current[step.conditionalOn];
      if (!prev || !step.showIf.includes(prev)) return true;
    }
    return false;
  }, []);

  const resolveText = useCallback((step: OnboardingStep): string => {
    let text = step.assistantText;
    if (step.conditionalText && step.conditionalOn) {
      const prev = answers.current[step.conditionalOn];
      if (prev && step.conditionalText[prev]) text = step.conditionalText[prev];
    }
    return text.replace('{{firstName}}', firstName);
  }, [firstName]);

  const advanceToNext = useCallback((fromIdx: number) => {
    let next = fromIdx + 1;
    while (next < steps.length && shouldSkipStep(steps[next])) next++;
    if (next >= steps.length) {
      setPhase('done');
      void onComplete(userRole);
    } else {
      setStepIndex(next);
      setPhase('typing');
    }
  }, [steps, shouldSkipStep, onComplete, userRole]);

  useEffect(() => {
    if (phase !== 'typing') return;
    const step = steps[stepIndex];
    if (shouldSkipStep(step)) {
      advanceToNext(stepIndex);
      return;
    }
    const timer = setTimeout(() => {
      const text = resolveText(step);
      setMessages((prev) => [...prev, { role: 'assistant', text }]);
      setPhase('waiting');
    }, 800);
    return () => clearTimeout(timer);
  }, [phase, stepIndex, steps, shouldSkipStep, resolveText, advanceToNext]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, phase, scrollToBottom]);

  const submitAnswer = useCallback(
    async (answer: string) => {
      const step = steps[stepIndex];
      answers.current[step.id] = answer;
      setMessages((prev) => [...prev, { role: 'user', text: answer }]);
      setInput('');
      setSelectedChips([]);

      if (step.followUp && answer === step.followUp.trigger) {
        setTimeout(() => {
          setMessages((prev) => [...prev, { role: 'assistant', text: step.followUp!.text }]);
          setTimeout(() => advanceToNext(stepIndex), 600);
        }, 700);
        return;
      }

      if (stepIndex >= steps.length - 1) {
        setPhase('done');
        await onComplete(userRole);
      } else {
        advanceToNext(stepIndex);
      }
    },
    [stepIndex, steps, onComplete, userRole, advanceToNext],
  );

  const handleChipPress = useCallback(
    (chip: string) => {
      const step = steps[stepIndex];
      if (step.inputType === 'tools' || step.inputType === 'multiselect') {
        setSelectedChips((prev) =>
          prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip],
        );
      } else {
        void submitAnswer(chip);
      }
    },
    [stepIndex, steps, submitAnswer],
  );

  const handleSend = useCallback(() => {
    const step = steps[stepIndex];
    if (step.inputType === 'tools' || step.inputType === 'multiselect') {
      if (selectedChips.length > 0) {
        void submitAnswer(selectedChips.join(', '));
      } else if (input.trim()) {
        void submitAnswer(input.trim());
      }
    } else {
      const val = input.trim();
      if (val) {
        void submitAnswer(val);
      } else if (step.optional) {
        void submitAnswer('(skipped)');
      }
    }
  }, [stepIndex, steps, input, selectedChips, submitAnswer]);

  const handleSkip = useCallback(() => {
    void submitAnswer('(skipped)');
  }, [submitAnswer]);

  const currentStep = steps[stepIndex];
  const progressPct = ((stepIndex + 1) / steps.length) * 100;
  const showMultiConfirm =
    (currentStep?.inputType === 'tools' || currentStep?.inputType === 'multiselect') &&
    selectedChips.length > 0;
  const showTextInput =
    currentStep?.inputType === 'text' ||
    currentStep?.inputType === 'decimal' ||
    currentStep?.inputType === 'numeric' ||
    currentStep?.inputType === 'tools';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Progress bar */}
      <View style={styles.progressHeader}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {stepIndex + 1} of {steps.length}
        </Text>
      </View>

      {/* Chat messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg, i) =>
          msg.role === 'assistant' ? (
            <View key={i} style={styles.assistantRow}>
              <View style={styles.aiAvatar}>
                <Text style={styles.aiAvatarText}>AI</Text>
              </View>
              <View style={styles.assistantBubble}>
                <Text style={styles.assistantText}>{msg.text}</Text>
              </View>
            </View>
          ) : (
            <View key={i} style={styles.userRow}>
              <View style={styles.userBubble}>
                <Text style={styles.userText}>{msg.text}</Text>
              </View>
            </View>
          ),
        )}
        {phase === 'typing' && <TypingIndicator />}
        {phase === 'done' && (
          <View style={styles.assistantRow}>
            <View style={styles.aiAvatar}>
              <Text style={styles.aiAvatarText}>AI</Text>
            </View>
            <View style={styles.assistantBubble}>
              <Text style={styles.assistantText}>
                {userRole === 'client'
                  ? "You're all set! Let me find you some great matches..."
                  : "Awesome \u2014 you're all set! Taking you to your dashboard..."}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input area */}
      {phase === 'waiting' && (
        <View style={styles.inputArea}>
          {/* Quick reply chips */}
          {(() => {
            let chipList = currentStep?.chips || [];
            if (currentStep?.conditionalChips && currentStep?.conditionalOn) {
              const prevAns = answers.current[currentStep.conditionalOn];
              if (prevAns) {
                for (const [match, cList] of Object.entries(currentStep.conditionalChips)) {
                  if (prevAns.includes(match)) { chipList = cList; break; }
                }
              }
            }
            return chipList;
          })().length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
              contentContainerStyle={styles.chipRow}
              keyboardShouldPersistTaps="handled"
            >
              {(() => {
                let chipList = currentStep?.chips || [];
                if (currentStep?.conditionalChips && currentStep?.conditionalOn) {
                  const prevAns = answers.current[currentStep.conditionalOn];
                  if (prevAns) {
                    for (const [match, cList] of Object.entries(currentStep.conditionalChips)) {
                      if (prevAns.includes(match)) { chipList = cList; break; }
                    }
                  }
                }
                return chipList;
              })().map((chip) => {
                const selected = selectedChips.includes(chip);
                return (
                  <TouchableOpacity
                    key={chip}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => handleChipPress(chip)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {chip}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Text input + send */}
          <View style={styles.inputRow}>
            {showTextInput && (
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                value={input}
                onChangeText={setInput}
                placeholder={currentStep?.placeholder || 'Type your answer...'}
                placeholderTextColor="#9aa0ae"
                onSubmitEditing={handleSend}
                returnKeyType="send"
                keyboardType={
                  currentStep?.inputType === 'decimal' ? 'decimal-pad' :
                  currentStep?.inputType === 'numeric' ? 'number-pad' : 'default'
                }
              />
            )}
            {showMultiConfirm ? (
              <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
                <Text style={styles.sendBtnText}>Done</Text>
              </TouchableOpacity>
            ) : showTextInput ? (
              <TouchableOpacity
                style={[styles.sendBtn, !input.trim() && !currentStep?.optional && styles.sendBtnOff]}
                onPress={input.trim() ? handleSend : currentStep?.optional ? handleSkip : undefined}
                disabled={!input.trim() && !currentStep?.optional}
              >
                <Text style={styles.sendBtnText}>
                  {!input.trim() && currentStep?.optional ? 'Skip' : 'Send'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8fb' },

  progressHeader: {
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e6ed',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e8ecf2',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: { height: '100%', borderRadius: 3, backgroundColor: '#1d6ecd' },
  progressText: { fontSize: 12, fontWeight: '600', color: '#9aa0ae', textAlign: 'center' },

  chatArea: { flex: 1 },
  chatContent: { padding: 16, paddingBottom: 8 },

  assistantRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1d6ecd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1d6ecd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAvatarText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  assistantBubble: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderTopLeftRadius: 4,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e6ed',
  },
  assistantText: { fontSize: 14, color: '#0f1623', lineHeight: 21 },

  userRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 14 },
  userBubble: {
    maxWidth: '80%',
    backgroundColor: '#1d6ecd',
    borderRadius: 14,
    borderTopRightRadius: 4,
    padding: 14,
  },
  userText: { fontSize: 14, color: '#fff', lineHeight: 21 },

  typingWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  typingBubble: {
    flexDirection: 'row',
    gap: 5,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderTopLeftRadius: 4,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e2e6ed',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9aa0ae',
  },

  inputArea: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e6ed',
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  chipScroll: { flexGrow: 0, maxHeight: 100 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e6ed',
    backgroundColor: '#fff',
  },
  chipSelected: { backgroundColor: '#1d6ecd', borderColor: '#1d6ecd' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#4a5568' },
  chipTextSelected: { color: '#fff' },

  inputRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e6ed',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f1623',
    backgroundColor: '#f6f8fb',
  },
  sendBtn: {
    justifyContent: 'center',
    backgroundColor: '#1d6ecd',
    paddingHorizontal: 18,
    borderRadius: 12,
    minHeight: 42,
  },
  sendBtnOff: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
