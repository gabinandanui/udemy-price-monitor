import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import firebaseConfig from './firebase';
import './App.css';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function App() {
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({ title: '', url: '', targetPrice: 399, thresholdPrice: 500 });
  const [loading, setLoading] = useState(false);

  // Live sync
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'courses'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setCourses(data);
    });
    return unsubscribe;
  }, []);

  const addCourse = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'courses'), {
        ...form,
        lastNotifiedLevel: 'NONE',
        addedAt: new Date().toISOString()
      });
      setForm({ title: '', url: '', targetPrice: 399, thresholdPrice: 500 });
    } catch (error) {
      alert('Error: ' + error.message);
    }
    setLoading(false);
  };

  const deleteCourse = async (id) => {
    if (confirm('Delete?')) await deleteDoc(doc(db, 'courses', id));
  };

  const resetCourse = async (course) => {
    await updateDoc(doc(db, 'courses', course.id), { lastNotifiedLevel: 'NONE' });
  };

  return (
    <div className="app">
      <header>
        <h1>📊 Udemy Price Dashboard</h1>
        <p>{courses.length} courses monitoring</p>
      </header>

      <section className="add-section">
        <h2>Add Course</h2>
        <form onSubmit={addCourse}>
          <input
            value={form.title}
            onChange={e => setForm({...form, title: e.target.value})}
            placeholder="Course name"
          />
          <input
            value={form.url}
            onChange={e => setForm({...form, url: e.target.value})}
            placeholder="Udemy URL"
          />
          <div className="price-row">
            <input
              type="number"
              value={form.targetPrice}
              onChange={e => setForm({...form, targetPrice: +e.target.value})}
              placeholder="Target ₹"
            />
            <input
              type="number"
              value={form.thresholdPrice}
              onChange={e => setForm({...form, thresholdPrice: +e.target.value})}
              placeholder="Threshold ₹"
            />
          </div>
          <button disabled={loading}>{loading ? 'Adding...' : 'Add'}</button>
        </form>
      </section>

      <section className="list-section">
        <h2>Courses</h2>
        <div className="grid">
          {courses.map(course => (
            <div key={course.id} className="card">
              <h3>{course.title}</h3>
              <a href={course.url} target="_blank" rel="noreferrer">🛒 Udemy</a>
              <div className="info">
                <div>🎯 {course.targetPrice}₹</div>
                <div>📊 {course.thresholdPrice}₹</div>
                <div>💰 {course.currentPrice ?? 0}₹</div>
                <span className={`badge ${course.lastNotifiedLevel}`}>
                  {course.lastNotifiedLevel || 'NONE'}
                </span>
              </div>
              <div className="buttons">
                <button onClick={() => resetCourse(course)}>Reset</button>
                <button onClick={() => deleteCourse(course.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default App;
