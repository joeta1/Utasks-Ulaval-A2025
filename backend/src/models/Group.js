const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  avatar: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index pour recherche rapide
groupSchema.index({ name: 1 });
groupSchema.index({ members: 1 });

// Méthode pour vérifier si un utilisateur est membre
groupSchema.methods.isMember = function(userId) {
  return this.members.some(memberId => memberId.toString() === userId.toString());
};

// Méthode pour ajouter un membre
groupSchema.methods.addMember = function(userId) {
  if (!this.isMember(userId)) {
    this.members.push(userId);
    this.updatedAt = new Date();
  }
};

// Méthode pour retirer un membre
groupSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(memberId => memberId.toString() !== userId.toString());
  this.updatedAt = new Date();
};

// Méthode pour formater la réponse
groupSchema.methods.toJSON = function() {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  
  // Formater les membres si ce sont des objets
  if (obj.members && Array.isArray(obj.members)) {
    obj.members = obj.members.map(m => {
      if (m._id) {
        return { id: m._id.toString(), username: m.username };
      }
      return typeof m === 'object' ? m.toString() : m;
    });
  }
  
  // Formater le créateur
  if (obj.creator && obj.creator._id) {
    obj.creator = { id: obj.creator._id.toString(), username: obj.creator.username };
  } else if (typeof obj.creator === 'object') {
    obj.creator = obj.creator.toString();
  }
  
  return obj;
};

module.exports = mongoose.model('Group', groupSchema);
