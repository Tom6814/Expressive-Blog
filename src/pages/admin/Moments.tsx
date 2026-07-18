import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { api } from "../../lib/api";
import { formatDistanceToNow } from "date-fns";
import { Loader } from "../../components/Loader";

export function AdminMoments() {
  const [moments, setMoments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form state
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await api.getMoments();
    setMoments(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createMoment({ content, images });
    setIsCreating(false);
    setContent(""); setImages([]); setNewImageUrl("");
    fetchData();
  };

  const addImage = () => {
    if (newImageUrl) {
      setImages([...images, newImageUrl]);
      setNewImageUrl("");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this moment?")) {
      await api.deleteMoment(id);
      fetchData();
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-display font-black text-on-surface">Moments</h1>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-full font-bold hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          {isCreating ? "Cancel" : "New Moment"}
        </button>
      </div>

      {isCreating ? (
        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="bg-surface-container rounded-[var(--radius-md3)] p-8 shadow-sm border border-outline-variant/10 space-y-6 mb-8"
        >
          <div>
            <label className="block text-sm font-bold text-on-surface-variant mb-2">What's on your mind?</label>
            <textarea 
              value={content} 
              onChange={e => setContent(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-surface border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none min-h-[150px]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-on-surface-variant mb-2 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Add Images
            </label>
            <div className="flex gap-2 mb-4">
              <input 
                type="url" 
                value={newImageUrl} 
                onChange={e => setNewImageUrl(e.target.value)}
                placeholder="https://..."
                className="flex-grow px-4 py-3 rounded-xl bg-surface border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              <button 
                type="button" 
                onClick={addImage}
                className="px-6 py-3 bg-secondary-container text-on-secondary-container rounded-xl font-bold hover:bg-secondary hover:text-on-secondary transition-colors"
              >
                Add
              </button>
            </div>
            
            {images.filter(img => img).length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.filter(img => img).map((img, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden aspect-video">
                    <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                    <button 
                      type="button"
                      onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                      className="absolute top-2 right-2 p-1.5 bg-error text-on-error rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" className="px-8 py-3 bg-primary text-on-primary rounded-full font-bold hover:bg-primary/90 transition-colors shadow-sm">
              Post Moment
            </button>
          </div>
        </motion.form>
      ) : null}

      <div className="space-y-6">
        {moments.map((moment, index) => (
          <motion.div
            key={moment.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-surface-container rounded-[var(--radius-md3)] p-6 shadow-sm border border-outline-variant/10 relative group"
          >
            <button 
              onClick={() => handleDelete(moment.id)}
              className="absolute top-6 right-6 p-2 text-error hover:bg-error-container rounded-full opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            
            <p className="text-sm text-on-surface-variant font-medium mb-4">
              {formatDistanceToNow(new Date(moment.date), { addSuffix: true })}
            </p>
            <p className="text-on-surface whitespace-pre-wrap mb-4">{moment.content}</p>
            
            {moment.images && moment.images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {moment.images.filter((img: string) => img).map((img: string, i: number) => (
                  <img key={i} src={img} alt="" className="h-32 w-auto object-cover rounded-lg flex-shrink-0" loading="lazy" referrerPolicy="no-referrer" />
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
