import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { updateProfile, updatePassword, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { firestore } from '../config/firebase';

const ProfileScreen = ({ navigation }) => {
  const { user, userProfile, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [photoURL, setPhotoURL] = useState('');

  useEffect(() => {
    if (user) {
      setDisplayName(userProfile?.displayName || user.displayName || '');
      setEmail(user.email || '');
      setPhotoURL(userProfile?.photoURL || user.photoURL || '');
    }
  }, [user, userProfile]);

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: displayName,
        photoURL: photoURL,
      });

      // Update Firestore user profile
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: displayName,
        photoURL: photoURL,
      });

      Alert.alert('Success', 'Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = () => {
    Alert.prompt(
      'Change Password',
      'Enter your current password',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Next',
          onPress: (currentPassword) => {
            if (!currentPassword) {
              Alert.alert('Error', 'Please enter your current password');
              return;
            }
            
            Alert.prompt(
              'New Password',
              'Enter your new password',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Change',
                  onPress: async (newPassword) => {
                    if (!newPassword || newPassword.length < 6) {
                      Alert.alert('Error', 'Password must be at least 6 characters');
                      return;
                    }

                    try {
                      setLoading(true);
                      
                      // Reauthenticate user
                      const credential = EmailAuthProvider.credential(user.email, currentPassword);
                      await reauthenticateWithCredential(user, credential);
                      
                      // Update password
                      await updatePassword(user, newPassword);
                      
                      Alert.alert('Success', 'Password changed successfully');
                    } catch (error) {
                      console.error('Error changing password:', error);
                      if (error.code === 'auth/wrong-password') {
                        Alert.alert('Error', 'Current password is incorrect');
                      } else {
                        Alert.alert('Error', error.message || 'Failed to change password');
                      }
                    } finally {
                      setLoading(false);
                    }
                  },
                },
              ],
              'secure-text'
            );
          },
        },
      ],
      'secure-text'
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.prompt(
              'Confirm Deletion',
              'Enter your password to confirm account deletion',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Account',
                  style: 'destructive',
                  onPress: async (password) => {
                    if (!password) {
                      Alert.alert('Error', 'Please enter your password');
                      return;
                    }

                    try {
                      setLoading(true);
                      
                      // Reauthenticate user
                      const credential = EmailAuthProvider.credential(user.email, password);
                      await reauthenticateWithCredential(user, credential);
                      
                      // Delete user data from Firestore
                      const userRef = doc(firestore, 'users', user.uid);
                      await deleteDoc(userRef);
                      
                      // Delete user account
                      await deleteUser(user);
                      
                      Alert.alert('Account Deleted', 'Your account has been deleted successfully');
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Login' }],
                      });
                    } catch (error) {
                      console.error('Error deleting account:', error);
                      if (error.code === 'auth/wrong-password') {
                        Alert.alert('Error', 'Password is incorrect');
                      } else {
                        Alert.alert('Error', error.message || 'Failed to delete account');
                      }
                    } finally {
                      setLoading(false);
                    }
                  },
                },
              ],
              'secure-text'
            );
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            const result = await signOut();
            if (result.success) {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        {!isEditing ? (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(true)}
          >
            <Ionicons name="create-outline" size={24} color={colors.primary.purple} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleSaveProfile}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary.purple} />
            ) : (
              <Ionicons name="checkmark" size={24} color={colors.primary.purple} />
            )}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 20 + insets.bottom }}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {photoURL ? (
              <Image source={{ uri: photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
          </View>

          {isEditing && (
            <TouchableOpacity style={styles.changePhotoButton}>
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your name"
              placeholderTextColor={colors.text.muted}
              editable={isEditing}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={email}
              editable={false}
            />
            <Text style={styles.helperText}>Email cannot be changed</Text>
          </View>

          {isEditing && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Photo URL (Optional)</Text>
              <TextInput
                style={styles.input}
                value={photoURL}
                onChangeText={setPhotoURL}
                placeholder="https://example.com/photo.jpg"
                placeholderTextColor={colors.text.muted}
                autoCapitalize="none"
              />
            </View>
          )}
        </View>

        {!isEditing && (
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleChangePassword}
              disabled={loading}
            >
              <Ionicons name="key-outline" size={22} color={colors.primary.purple} />
              <Text style={styles.actionButtonText}>Change Password</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={handleDeleteAccount}
              disabled={loading}
            >
              <Ionicons name="trash-outline" size={22} color="#ef4444" />
              <Text style={[styles.actionButtonText, styles.dangerText]}>Delete Account</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.logoutButton]}
              onPress={handleLogout}
              disabled={loading}
            >
              <Ionicons name="log-out-outline" size={22} color="#ef4444" />
              <Text style={[styles.actionButtonText, styles.dangerText]}>Logout</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.slate900,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 14 : 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.slate800,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.text.primary,
  },
  changePhotoButton: {
    marginTop: 8,
  },
  changePhotoText: {
    fontSize: 14,
    color: colors.primary.purple,
    fontWeight: '600',
  },
  formSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.neutral.slate800,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.neutral.slate700,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  helperText: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 6,
  },
  actionsSection: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.slate800,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 12,
  },
  dangerButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  dangerText: {
    color: '#ef4444',
  },
  logoutButton: {
    marginTop: 8,
  },
});

export default ProfileScreen;
