import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updateProfile
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    collection, 
    query, 
    where, 
    orderBy, 
    limit 
} from 'firebase/firestore';
import { 
    getStorage, 
    ref as sRef, 
    uploadBytes, 
    getDownloadURL 
} from 'firebase/storage';
import config from '../firebase-applet-config.json';

const firebaseConfig = {
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
    measurementId: config.measurementId
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = config.firestoreDatabaseId ? getFirestore(app, config.firestoreDatabaseId) : getFirestore(app);
export const storage = getStorage(app);

export function getCurrentUser() {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
        });
    });
}

const OperationType = {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    LIST: 'list',
    GET: 'get',
    WRITE: 'write'
};

function handleFirestoreError(error, operationType, path) {
    const errMessage = error instanceof Error ? error.message : String(error);
    const errInfo = {
        error: errMessage,
        authInfo: {
            userId: auth.currentUser ? auth.currentUser.uid : null,
            email: auth.currentUser ? auth.currentUser.email : null,
            emailVerified: auth.currentUser ? auth.currentUser.emailVerified : null,
            isAnonymous: auth.currentUser ? auth.currentUser.isAnonymous : null,
            tenantId: auth.currentUser ? auth.currentUser.tenantId : null,
            providerInfo: auth.currentUser && auth.currentUser.providerData ? auth.currentUser.providerData.map(p => ({
                providerId: p.providerId,
                email: p.email
            })) : []
        },
        operationType,
        path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
}

export const firebaseDb = {
    // Get all items in a collection
    async getAll(collectionName, orderByField = null, orderDir = 'asc') {
        try {
            const colRef = collection(db, collectionName);
            let q = colRef;
            if (orderByField) {
                q = query(colRef, orderBy(orderByField, orderDir));
            }
            const querySnapshot = await getDocs(q);
            const items = [];
            querySnapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() });
            });
            return { data: items, error: null };
        } catch (error) {
            console.error(`Error in getAll ${collectionName}:`, error);
            if (error.code === 'permission-denied' || (error.message && (error.message.includes('permission') || error.message.includes('Permission')))) {
                handleFirestoreError(error, OperationType.LIST, collectionName);
            }
            return { data: null, error };
        }
    },

    // Get a single item by id
    async getOne(collectionName, id) {
        try {
            const docRef = doc(db, collectionName, id.toString());
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { data: { id: docSnap.id, ...docSnap.data() }, error: null };
            } else {
                return { data: null, error: new Error("Document not found") };
            }
        } catch (error) {
            console.error(`Error in getOne ${collectionName}:`, error);
            if (error.code === 'permission-denied' || (error.message && (error.message.includes('permission') || error.message.includes('Permission')))) {
                handleFirestoreError(error, OperationType.GET, `${collectionName}/${id}`);
            }
            return { data: null, error };
        }
    },

    // Insert an item or items
    async insert(collectionName, data) {
        try {
            const colRef = collection(db, collectionName);
            if (Array.isArray(data)) {
                const inserted = [];
                for (const item of data) {
                    let docRef;
                    if (item.id) {
                        docRef = doc(db, collectionName, item.id.toString());
                        const itemCopy = { ...item };
                        delete itemCopy.id;
                        await setDoc(docRef, itemCopy);
                        inserted.push({ id: item.id, ...itemCopy });
                    } else {
                        docRef = await addDoc(colRef, item);
                        inserted.push({ id: docRef.id, ...item });
                    }
                }
                return { data: inserted, error: null };
            } else {
                let docRef;
                if (data.id) {
                    docRef = doc(db, collectionName, data.id.toString());
                    const dataCopy = { ...data };
                    delete dataCopy.id;
                    await setDoc(docRef, dataCopy);
                    return { data: { id: data.id, ...dataCopy }, error: null };
                } else {
                    docRef = await addDoc(colRef, data);
                    return { data: { id: docRef.id, ...data }, error: null };
                }
            }
        } catch (error) {
            console.error(`Error in insert ${collectionName}:`, error);
            if (error.code === 'permission-denied' || (error.message && (error.message.includes('permission') || error.message.includes('Permission')))) {
                handleFirestoreError(error, OperationType.CREATE, collectionName);
            }
            return { data: null, error };
        }
    },

    // Update an item
    async update(collectionName, id, data) {
        try {
            const docRef = doc(db, collectionName, id.toString());
            await updateDoc(docRef, data);
            return { error: null };
        } catch (error) {
            console.error(`Error in update ${collectionName}:`, error);
            if (error.code === 'permission-denied' || (error.message && (error.message.includes('permission') || error.message.includes('Permission')))) {
                handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${id}`);
            }
            return { error };
        }
    },

    // Delete an item
    async delete(collectionName, id) {
        try {
            const docRef = doc(db, collectionName, id.toString());
            await deleteDoc(docRef);
            return { error: null };
        } catch (error) {
            console.error(`Error in delete ${collectionName}:`, error);
            if (error.code === 'permission-denied' || (error.message && (error.message.includes('permission') || error.message.includes('Permission')))) {
                handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
            }
            return { error };
        }
    },

    // Query items using simple filters
    async query(collectionName, filters = [], orderByField = null, orderDir = 'asc') {
        try {
            const colRef = collection(db, collectionName);
            let q = colRef;
            const constraints = [];
            for (const filter of filters) {
                constraints.push(where(filter[0], filter[1], filter[2]));
            }
            if (orderByField) {
                constraints.push(orderBy(orderByField, orderDir));
            }
            if (constraints.length > 0) {
                q = query(colRef, ...constraints);
            }
            const querySnapshot = await getDocs(q);
            const items = [];
            querySnapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() });
            });
            return { data: items, error: null };
        } catch (error) {
            console.error(`Error in query ${collectionName}:`, error);
            if (error.code === 'permission-denied' || (error.message && (error.message.includes('permission') || error.message.includes('Permission')))) {
                handleFirestoreError(error, OperationType.LIST, collectionName);
            }
            return { data: null, error };
        }
    }
};

export const firebaseStorage = {
    async upload(bucketName, filePath, file) {
        try {
            const storageRef = sRef(storage, `${bucketName}/${filePath}`);
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);
            return { data: { publicUrl: downloadUrl }, error: null };
        } catch (error) {
            console.error("Error uploading to storage:", error);
            return { data: null, error };
        }
    }
};
