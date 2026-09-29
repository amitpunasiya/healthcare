import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/client';

export const RegisterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [role, setRole] = useState<'CUSTOMER' | 'PROVIDER'>('CUSTOMER');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Provider Specific States
  const [categories, setCategories] = useState<any[]>([
    { _id: '6aa27c8e4291a7ffae1f9572', name: 'Physiotherapy' },
    { _id: '6aa27c8e4291a7ffae1f9575', name: 'Occupational Therapy' },
    { _id: '6aa27c8f4291a7ffae1f957b', name: 'Elder Care' },
    { _id: 'nursing-care', name: 'Lab / Home Care' },
  ]);
  const [selectedCategory, setSelectedCategory] = useState('6aa27c8e4291a7ffae1f9572');
  const [qualification, setQualification] = useState('BPT');
  const [experienceYears, setExperienceYears] = useState('2');
  const [chargesPerSession, setChargesPerSession] = useState('500');
  const [city, setCity] = useState('Indore');
  const [collegeName, setCollegeName] = useState('');

  // Documents & Verification States
  const [uploadedDocs, setUploadedDocs] = useState<{
    [key: string]: { docId: string; name: string; uri: string };
  }>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');

  const { register, login } = useAuth();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/services/categories');
        if (res.data?.success && Array.isArray(res.data.categories) && res.data.categories.length > 0) {
          setCategories(res.data.categories);
          setSelectedCategory(res.data.categories[0]._id);
        }
      } catch (err) {
        console.log('Using default categories for registration fallback');
      }
    };
    fetchCategories();
  }, []);

  const pickAndUploadDocument = async (docType: string) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow gallery access to upload documents.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: docType === 'PROFILE_PHOTO',
        aspect: docType === 'PROFILE_PHOTO' ? [1, 1] : undefined,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      await performUpload(docType, asset.uri, asset.fileName || `${docType.toLowerCase()}_${Date.now()}.jpg`, asset.mimeType || 'image/jpeg');
    } catch (err: any) {
      console.log('Pick error:', err);
      Alert.alert('Selection Failed', 'Could not select document image.');
    }
  };

  const takeSelfiePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow camera access to take a selfie photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.front,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      await performUpload('PROFILE_PHOTO', asset.uri, `selfie_${Date.now()}.jpg`, asset.mimeType || 'image/jpeg');
    } catch (err: any) {
      console.log('Camera error:', err);
      Alert.alert('Camera Error', 'Could not capture selfie photo.');
    }
  };

  const performUpload = async (docType: string, uri: string, filename: string, mimeType: string) => {
    setUploadingDoc(docType);
    try {
      const formData = new FormData();
      formData.append('document', {
        uri,
        name: filename,
        type: mimeType,
      } as any);
      formData.append('documentType', docType);

      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success && res.data.document) {
        setUploadedDocs((prev) => ({
          ...prev,
          [docType]: {
            docId: res.data.document.docId,
            name: res.data.document.originalName || filename,
            uri,
          },
        }));
        Alert.alert('Document Attached! ✅', `${docType.replace(/_/g, ' ')} has been uploaded successfully.`);
      } else {
        Alert.alert('Upload Failed', res.data?.message || 'Could not verify document upload.');
      }
    } catch (err: any) {
      console.log('Upload error:', err);
      Alert.alert('Upload Error', err.response?.data?.message || 'Failed to upload document. Please ensure file is under 10MB.');
    } finally {
      setUploadingDoc(null);
    }
  };

  const removeDoc = (docType: string) => {
    setUploadedDocs((prev) => {
      const copy = { ...prev };
      delete copy[docType];
      return copy;
    });
  };

  const renderDocUploadButton = (docType: string, label: string) => {
    const isUploaded = !!uploadedDocs[docType];
    const isUploading = uploadingDoc === docType;

    if (isUploaded) {
      return (
        <View style={styles.docPreviewRow}>
          <Ionicons name="document-text" size={18} color={Colors.success} />
          <Text style={styles.docFileName} numberOfLines={1}>
            {uploadedDocs[docType].name}
          </Text>
          <TouchableOpacity onPress={() => removeDoc(docType)} style={styles.removeDocBtn}>
            <Ionicons name="close-circle" size={20} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={styles.uploadDocSingleBtn}
        onPress={() => pickAndUploadDocument(docType)}
        disabled={isUploading}
        activeOpacity={0.7}
      >
        {isUploading ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={16} color={Colors.primary} />
            <Text style={styles.uploadDocBtnText}>Upload {label}</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password) {
      setError('Please fill in all required fields (Name, Email, Phone, Password).');
      return;
    }
    if (phone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (role === 'PROVIDER' && !qualification.trim()) {
      setError('Please specify your qualification / degree.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      let payload: any = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        role,
      };

      if (role === 'PROVIDER') {
        const expNum = parseInt(experienceYears, 10) || 1;
        const chargesNum = parseInt(chargesPerSession, 10) || 500;
        payload = {
          ...payload,
          category: selectedCategory,
          qualification: qualification.trim() || 'Certified Healthcare Specialist',
          experienceYears: expNum,
          experienceType: expNum === 0 ? 'FRESHER' : 'YEARS',
          experienceValue: expNum,
          chargesPerSession: chargesNum,
          city: city.trim() || 'Indore',
          serviceLocations: [city.trim() || 'Indore'],
          collegeName: collegeName.trim() || 'Medical College',
          education: {
            collegeName: collegeName.trim() || 'Medical College',
            courseName: qualification.trim() || 'Healthcare Degree',
            startYear: 2020,
            completionYear: 2024,
            courseStatus: 'COMPLETED',
          },
          homeVisitAvailable: true,
          clinicVisitAvailable: false,
          // Documents and ID numbers
          profilePhotoDocId: uploadedDocs['PROFILE_PHOTO']?.docId,
          selfieDocId: uploadedDocs['PROFILE_PHOTO']?.docId,
          aadhaarDocId: uploadedDocs['AADHAAR']?.docId,
          panDocId: uploadedDocs['PAN']?.docId,
          degreeDocId: uploadedDocs['DEGREE']?.docId,
          studentIdDocId: uploadedDocs['STUDENT_ID']?.docId,
          experienceCertDocId: uploadedDocs['EXPERIENCE_CERT']?.docId,
          labCertDocId: uploadedDocs['LAB_CERT']?.docId,
          aadhaarNumber: aadhaarNumber.trim(),
          panNumber: panNumber.trim().toUpperCase(),
        };
      }

      const res = await register(payload);
      if (res.success) {
        Alert.alert(
          role === 'PROVIDER' ? 'Healthcare Staff Registered! 🩺' : 'Registration Successful! 🎉',
          role === 'PROVIDER'
            ? 'Your staff account and documents have been submitted. Logging you into Staff Duty Portal...'
            : 'Welcome to CarePulse! Logging you in...',
          [
            {
              text: 'Continue',
              onPress: async () => {
                await login(email, password);
              },
            },
          ]
        );
        await login(email, password);
      } else {
        setError(res.message || 'Registration failed');
      }
    } catch (err: any) {
      setError('An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.formTitle}>Create CarePulse Account</Text>
          <Text style={styles.formSubtitle}>Join India's trusted home healthcare network</Text>

          {/* Role selector tab */}
          <Text style={styles.inputLabel}>I want to join as</Text>
          <View style={styles.roleSelector}>
            <TouchableOpacity
              style={[styles.roleBtn, role === 'CUSTOMER' && styles.roleBtnActive]}
              onPress={() => setRole('CUSTOMER')}
            >
              <Ionicons
                name="person-outline"
                size={18}
                color={role === 'CUSTOMER' ? '#ffffff' : Colors.textMuted}
              />
              <Text style={[styles.roleBtnText, role === 'CUSTOMER' && styles.roleBtnTextActive]}>
                Patient / Customer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleBtn, role === 'PROVIDER' && styles.roleBtnActive]}
              onPress={() => setRole('PROVIDER')}
            >
              <Ionicons
                name="medkit-outline"
                size={18}
                color={role === 'PROVIDER' ? '#ffffff' : Colors.textMuted}
              />
              <Text style={[styles.roleBtnText, role === 'PROVIDER' && styles.roleBtnTextActive]}>
                Healthcare Staff
              </Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={Colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Basic Info: Full Name */}
          <Text style={styles.inputLabel}>
            {role === 'PROVIDER' ? 'Doctor / Staff Full Name' : 'Full Name'}
          </Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={role === 'PROVIDER' ? 'e.g. Dr. Ramesh Sharma / Sister Sunita' : 'e.g. Ramesh Sharma'}
              placeholderTextColor={Colors.textLight}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          {/* Email */}
          <Text style={styles.inputLabel}>Email Address</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              placeholderTextColor={Colors.textLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Phone */}
          <Text style={styles.inputLabel}>Mobile Phone</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="call-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="9876543210"
              placeholderTextColor={Colors.textLight}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          {/* Password */}
          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={Colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {/* PROVIDER PROFESSIONAL SECTION */}
          {role === 'PROVIDER' && (
            <View style={styles.providerSection}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="medical" size={17} color={Colors.primary} />
                <Text style={styles.sectionHeading}>Healthcare Staff Profile</Text>
              </View>

              {/* Specialization / Category Selection */}
              <Text style={styles.inputLabel}>Specialization / Department</Text>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat._id;
                  const catNameLower = (cat.name || '').toLowerCase();
                  const iconName = catNameLower.includes('physio')
                    ? 'fitness-outline'
                    : catNameLower.includes('occup')
                    ? 'body-outline'
                    : catNameLower.includes('elder')
                    ? 'heart-outline'
                    : 'flask-outline';

                  return (
                    <TouchableOpacity
                      key={cat._id}
                      style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
                      onPress={() => setSelectedCategory(cat._id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={iconName}
                        size={16}
                        color={isSelected ? Colors.primary : Colors.textMuted}
                      />
                      <Text
                        style={[styles.categoryCardText, isSelected && styles.categoryCardTextSelected]}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Highest Qualification */}
              <Text style={styles.inputLabel}>Degree / Qualification</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="school-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. BPT, MPT, GNM, B.Sc Nursing, DMLT"
                  placeholderTextColor={Colors.textLight}
                  value={qualification}
                  onChangeText={setQualification}
                />
              </View>
              <View style={styles.chipsRow}>
                {['BPT', 'MPT', 'GNM', 'B.Sc Nursing', 'DPT', 'DMLT'].map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={[styles.chip, qualification === q && styles.chipActive]}
                    onPress={() => setQualification(q)}
                  >
                    <Text style={[styles.chipText, qualification === q && styles.chipTextActive]}>
                      {q}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Experience */}
              <Text style={styles.inputLabel}>Work Experience</Text>
              <View style={styles.chipsRow}>
                {[
                  { label: 'Fresher (0 yr)', val: '0' },
                  { label: '1-2 Years', val: '2' },
                  { label: '3-5 Years', val: '4' },
                  { label: '5+ Years', val: '6' },
                ].map((exp) => (
                  <TouchableOpacity
                    key={exp.val}
                    style={[styles.chip, experienceYears === exp.val && styles.chipActive]}
                    onPress={() => setExperienceYears(exp.val)}
                  >
                    <Text style={[styles.chipText, experienceYears === exp.val && styles.chipTextActive]}>
                      {exp.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Visit Fee & City in 2 Columns */}
              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Visit Fee (₹)</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.currencyPrefix}>₹</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="500"
                      placeholderTextColor={Colors.textLight}
                      value={chargesPerSession}
                      onChangeText={setChargesPerSession}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>City / Area</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="location-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Indore"
                      placeholderTextColor={Colors.textLight}
                      value={city}
                      onChangeText={setCity}
                    />
                  </View>
                </View>
              </View>

              {/* College / Institute */}
              <Text style={styles.inputLabel}>College / Institute (Optional)</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="business-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. MGM Medical College, Indore"
                  placeholderTextColor={Colors.textLight}
                  value={collegeName}
                  onChangeText={setCollegeName}
                />
              </View>

              {/* DOCUMENTS & VERIFICATION SECTION */}
              <View style={styles.docSectionDivider}>
                <Ionicons name="shield-checkmark" size={18} color={Colors.primary} />
                <Text style={styles.sectionHeading}>Verification Documents (दस्तावेज़)</Text>
              </View>
              <Text style={styles.docSectionSubtitle}>
                Attach documents for faster profile verification and duty approval.
              </Text>

              {/* 1. Selfie / Profile Photo */}
              <View style={styles.docCard}>
                <View style={styles.docCardHeader}>
                  <View style={styles.docIconBox}>
                    <Ionicons name="camera-outline" size={18} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docCardTitle}>Selfie Photo / Profile (सेल्फी फोटो)</Text>
                    <Text style={styles.docCardDesc}>Front clear selfie for patient verification</Text>
                  </View>
                  {uploadedDocs['PROFILE_PHOTO'] ? (
                    <View style={styles.uploadedBadge}>
                      <Ionicons name="checkmark-circle" size={15} color={Colors.success} />
                      <Text style={styles.uploadedBadgeText}>Attached</Text>
                    </View>
                  ) : null}
                </View>

                {uploadedDocs['PROFILE_PHOTO'] ? (
                  <View style={styles.docPreviewRow}>
                    <Image source={{ uri: uploadedDocs['PROFILE_PHOTO'].uri }} style={styles.docThumb} />
                    <Text style={styles.docFileName} numberOfLines={1}>
                      {uploadedDocs['PROFILE_PHOTO'].name}
                    </Text>
                    <TouchableOpacity onPress={() => removeDoc('PROFILE_PHOTO')} style={styles.removeDocBtn}>
                      <Ionicons name="close-circle" size={20} color={Colors.danger} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.docActionRow}>
                    <TouchableOpacity
                      style={styles.uploadDocBtn}
                      onPress={takeSelfiePhoto}
                      disabled={uploadingDoc === 'PROFILE_PHOTO'}
                    >
                      {uploadingDoc === 'PROFILE_PHOTO' ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                      ) : (
                        <>
                          <Ionicons name="camera" size={15} color={Colors.primary} />
                          <Text style={styles.uploadDocBtnText}>Take Selfie</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.uploadDocBtnOutline}
                      onPress={() => pickAndUploadDocument('PROFILE_PHOTO')}
                      disabled={uploadingDoc === 'PROFILE_PHOTO'}
                    >
                      <Ionicons name="images-outline" size={15} color={Colors.primary} />
                      <Text style={styles.uploadDocBtnText}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* 2. Aadhaar Card */}
              <View style={styles.docCard}>
                <View style={styles.docCardHeader}>
                  <View style={styles.docIconBox}>
                    <Ionicons name="card-outline" size={18} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docCardTitle}>Aadhaar Card (आधार कार्ड)</Text>
                    <Text style={styles.docCardDesc}>Govt identity proof photo / card</Text>
                  </View>
                  {uploadedDocs['AADHAAR'] ? (
                    <View style={styles.uploadedBadge}>
                      <Ionicons name="checkmark-circle" size={15} color={Colors.success} />
                      <Text style={styles.uploadedBadgeText}>Attached</Text>
                    </View>
                  ) : null}
                </View>

                <TextInput
                  style={styles.docNumberInput}
                  placeholder="Aadhaar No. (12 digits e.g. 1234 5678 9012)"
                  placeholderTextColor={Colors.textLight}
                  value={aadhaarNumber}
                  onChangeText={setAadhaarNumber}
                  keyboardType="numeric"
                  maxLength={14}
                />
                {renderDocUploadButton('AADHAAR', 'Aadhaar Card')}
              </View>

              {/* 3. PAN Card */}
              <View style={styles.docCard}>
                <View style={styles.docCardHeader}>
                  <View style={styles.docIconBox}>
                    <Ionicons name="receipt-outline" size={18} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docCardTitle}>PAN Card (पैन कार्ड)</Text>
                    <Text style={styles.docCardDesc}>For payouts and commission settlements</Text>
                  </View>
                  {uploadedDocs['PAN'] ? (
                    <View style={styles.uploadedBadge}>
                      <Ionicons name="checkmark-circle" size={15} color={Colors.success} />
                      <Text style={styles.uploadedBadgeText}>Attached</Text>
                    </View>
                  ) : null}
                </View>

                <TextInput
                  style={styles.docNumberInput}
                  placeholder="PAN No. (10 chars e.g. ABCDE1234F)"
                  placeholderTextColor={Colors.textLight}
                  value={panNumber}
                  onChangeText={(t) => setPanNumber(t.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={10}
                />
                {renderDocUploadButton('PAN', 'PAN Card')}
              </View>

              {/* 4. Degree / Diploma Certificate */}
              <View style={styles.docCard}>
                <View style={styles.docCardHeader}>
                  <View style={styles.docIconBox}>
                    <Ionicons name="ribbon-outline" size={18} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docCardTitle}>Degree / Certificate (डिग्री)</Text>
                    <Text style={styles.docCardDesc}>BPT, MPT, Nursing, or Diploma degree</Text>
                  </View>
                  {uploadedDocs['DEGREE'] ? (
                    <View style={styles.uploadedBadge}>
                      <Ionicons name="checkmark-circle" size={15} color={Colors.success} />
                      <Text style={styles.uploadedBadgeText}>Attached</Text>
                    </View>
                  ) : null}
                </View>
                {renderDocUploadButton('DEGREE', 'Degree / Certificate')}
              </View>

              {/* 5. Experience Certificate */}
              <View style={styles.docCard}>
                <View style={styles.docCardHeader}>
                  <View style={styles.docIconBox}>
                    <Ionicons name="briefcase-outline" size={18} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docCardTitle}>Experience Certificate (अनुभव प्रमाण पत्र)</Text>
                    <Text style={styles.docCardDesc}>Hospital / clinic experience letter if available</Text>
                  </View>
                  {uploadedDocs['EXPERIENCE_CERT'] ? (
                    <View style={styles.uploadedBadge}>
                      <Ionicons name="checkmark-circle" size={15} color={Colors.success} />
                      <Text style={styles.uploadedBadgeText}>Attached</Text>
                    </View>
                  ) : null}
                </View>
                {renderDocUploadButton('EXPERIENCE_CERT', 'Experience Certificate')}
              </View>

              {/* 6. College ID / Student ID */}
              <View style={styles.docCard}>
                <View style={styles.docCardHeader}>
                  <View style={styles.docIconBox}>
                    <Ionicons name="id-card-outline" size={18} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docCardTitle}>College ID (कॉलेज आईडी - If studying)</Text>
                    <Text style={styles.docCardDesc}>Student ID or trainee verification card</Text>
                  </View>
                  {uploadedDocs['STUDENT_ID'] ? (
                    <View style={styles.uploadedBadge}>
                      <Ionicons name="checkmark-circle" size={15} color={Colors.success} />
                      <Text style={styles.uploadedBadgeText}>Attached</Text>
                    </View>
                  ) : null}
                </View>
                {renderDocUploadButton('STUDENT_ID', 'College ID')}
              </View>

              {/* 7. Lab Certificate */}
              <View style={styles.docCard}>
                <View style={styles.docCardHeader}>
                  <View style={styles.docIconBox}>
                    <Ionicons name="flask-outline" size={18} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docCardTitle}>Lab / DMLT Certificate (लैब सर्टिफ़िकेट)</Text>
                    <Text style={styles.docCardDesc}>DMLT accreditation or lab technician cert</Text>
                  </View>
                  {uploadedDocs['LAB_CERT'] ? (
                    <View style={styles.uploadedBadge}>
                      <Ionicons name="checkmark-circle" size={15} color={Colors.success} />
                      <Text style={styles.uploadedBadgeText}>Attached</Text>
                    </View>
                  ) : null}
                </View>
                {renderDocUploadButton('LAB_CERT', 'Lab Certificate')}
              </View>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitBtnText}>
                {role === 'PROVIDER' ? 'Register as Healthcare Staff' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already registered? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 36,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textMain,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 18,
  },
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.borderLight,
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  roleBtnActive: {
    backgroundColor: Colors.primary,
  },
  roleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  roleBtnTextActive: {
    color: '#ffffff',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    flex: 1,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMain,
    marginBottom: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.borderLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 14,
  },
  inputIcon: {
    marginRight: 8,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.textMain,
  },
  providerSection: {
    marginTop: 4,
    marginBottom: 14,
    backgroundColor: '#f0fdf4',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  categoryCard: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  categoryCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  categoryCardText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMain,
    flex: 1,
  },
  categoryCardTextSelected: {
    color: Colors.primary,
    fontWeight: '800',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
    marginTop: -4,
  },
  chip: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  chipTextActive: {
    color: '#ffffff',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  docSectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    marginBottom: 4,
    borderTopWidth: 1,
    borderTopColor: '#dcfce7',
    paddingTop: 14,
  },
  docSectionSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
    lineHeight: 16,
  },
  docCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 10,
  },
  docCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  docIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMain,
  },
  docCardDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  uploadedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  uploadedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.success,
  },
  docNumberInput: {
    backgroundColor: Colors.borderLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    fontSize: 12,
    color: Colors.textMain,
    marginBottom: 8,
  },
  docActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  uploadDocBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadDocBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadDocSingleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  uploadDocBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  docPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  docThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: Colors.border,
  },
  docFileName: {
    fontSize: 12,
    color: Colors.textMain,
    fontWeight: '600',
    flex: 1,
  },
  removeDocBtn: {
    padding: 2,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
  },
  loginText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  loginLink: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
