import * as FileSystem from 'expo-file-system';
import { firestore } from '../config/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc,
  deleteDoc,
  getDocs,
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';

/**
 * Download Service - Handles offline downloads
 */

const DOWNLOADS_DIR = `${FileSystem.documentDirectory}downloads/`;

// Ensure downloads directory exists
const ensureDownloadsDir = async () => {
  const dirInfo = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true });
  }
};

// Start a download
export const startDownload = async (userId, contentData) => {
  try {
    await ensureDownloadsDir();

    const { contentType, contentId, title, streamUrl, poster, metadata } = contentData;
    
    // Create download record in Firestore
    const downloadsRef = collection(firestore, 'downloads');
    const docRef = await addDoc(downloadsRef, {
      userId,
      contentType, // 'movie', 'series', 'episode'
      contentId,
      title,
      streamUrl,
      poster: poster || '',
      metadata: metadata || {},
      status: 'downloading', // 'downloading', 'paused', 'completed', 'failed'
      progress: 0,
      totalBytes: 0,
      downloadedBytes: 0,
      localUri: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const downloadId = docRef.id;
    const fileName = `${downloadId}.mp4`;
    const fileUri = `${DOWNLOADS_DIR}${fileName}`;

    // Start the download
    const downloadResumable = FileSystem.createDownloadResumable(
      streamUrl,
      fileUri,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        
        // Update Firestore with progress
        updateDoc(doc(firestore, 'downloads', downloadId), {
          progress: Math.round(progress * 100),
          downloadedBytes: downloadProgress.totalBytesWritten,
          totalBytes: downloadProgress.totalBytesExpectedToWrite,
          updatedAt: serverTimestamp(),
        }).catch(err => console.error('Error updating progress:', err));
      }
    );

    try {
      const result = await downloadResumable.downloadAsync();
      
      // Mark as completed
      await updateDoc(doc(firestore, 'downloads', downloadId), {
        status: 'completed',
        progress: 100,
        localUri: result.uri,
        updatedAt: serverTimestamp(),
      });

      return { success: true, downloadId, localUri: result.uri };
    } catch (downloadError) {
      console.error('Download failed:', downloadError);
      
      // Mark as failed
      await updateDoc(doc(firestore, 'downloads', downloadId), {
        status: 'failed',
        error: downloadError.message,
        updatedAt: serverTimestamp(),
      });

      return { success: false, error: downloadError.message };
    }
  } catch (error) {
    console.error('Error starting download:', error);
    return { success: false, error: error.message };
  }
};

// Pause a download (Note: expo-file-system doesn't support pause/resume natively)
export const pauseDownload = async (downloadId) => {
  try {
    // Update status to paused
    await updateDoc(doc(firestore, 'downloads', downloadId), {
      status: 'paused',
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error pausing download:', error);
    return { success: false, error: error.message };
  }
};

// Cancel/Delete a download
export const cancelDownload = async (downloadId) => {
  try {
    // Get download info
    const downloadDoc = await getDocs(
      query(collection(firestore, 'downloads'), where('__name__', '==', downloadId))
    );

    if (!downloadDoc.empty) {
      const downloadData = downloadDoc.docs[0].data();
      
      // Delete local file if exists
      if (downloadData.localUri) {
        const fileInfo = await FileSystem.getInfoAsync(downloadData.localUri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(downloadData.localUri);
        }
      }
    }

    // Delete from Firestore
    await deleteDoc(doc(firestore, 'downloads', downloadId));

    return { success: true };
  } catch (error) {
    console.error('Error canceling download:', error);
    return { success: false, error: error.message };
  }
};

// Get user downloads
export const getUserDownloads = async (userId, status = null) => {
  try {
    const downloadsRef = collection(firestore, 'downloads');
    let q;

    if (status) {
      q = query(
        downloadsRef,
        where('userId', '==', userId),
        where('status', '==', status)
      );
    } else {
      q = query(
        downloadsRef,
        where('userId', '==', userId)
      );
    }

    const snapshot = await getDocs(q);
    const downloads = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, data: downloads };
  } catch (error) {
    console.error('Error getting downloads:', error);
    return { success: false, error: error.message };
  }
};

// Get storage usage
export const getStorageUsage = async () => {
  try {
    await ensureDownloadsDir();
    
    const files = await FileSystem.readDirectoryAsync(DOWNLOADS_DIR);
    let totalSize = 0;

    for (const file of files) {
      const fileUri = `${DOWNLOADS_DIR}${file}`;
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists && fileInfo.size) {
        totalSize += fileInfo.size;
      }
    }

    return { 
      success: true, 
      totalBytes: totalSize,
      totalMB: (totalSize / (1024 * 1024)).toFixed(2),
      fileCount: files.length,
    };
  } catch (error) {
    console.error('Error getting storage usage:', error);
    return { success: false, error: error.message };
  }
};

// Clear all downloads
export const clearAllDownloads = async (userId) => {
  try {
    // Get all user downloads
    const result = await getUserDownloads(userId);
    
    if (result.success && result.data) {
      for (const download of result.data) {
        await cancelDownload(download.id);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error clearing downloads:', error);
    return { success: false, error: error.message };
  }
};

// Check if content is downloaded
export const isDownloaded = async (userId, contentId) => {
  try {
    const downloadsRef = collection(firestore, 'downloads');
    const q = query(
      downloadsRef,
      where('userId', '==', userId),
      where('contentId', '==', contentId),
      where('status', '==', 'completed')
    );
    
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const downloadData = snapshot.docs[0].data();
      return { 
        success: true, 
        isDownloaded: true,
        downloadId: snapshot.docs[0].id,
        localUri: downloadData.localUri,
      };
    }

    return { success: true, isDownloaded: false };
  } catch (error) {
    console.error('Error checking download:', error);
    return { success: false, error: error.message };
  }
};

// Get download by content ID
export const getDownloadByContentId = async (userId, contentId) => {
  try {
    const downloadsRef = collection(firestore, 'downloads');
    const q = query(
      downloadsRef,
      where('userId', '==', userId),
      where('contentId', '==', contentId)
    );
    
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return { 
        success: true, 
        data: {
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data(),
        }
      };
    }

    return { success: true, data: null };
  } catch (error) {
    console.error('Error getting download:', error);
    return { success: false, error: error.message };
  }
};
