const express = require('express');
const Group = require('../models/Group');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// POST /api/groups - Créer un nouveau groupe
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, memberIds } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Le nom du groupe est requis'
      });
    }
    
    // Créer le groupe avec le créateur comme premier membre
    const members = [req.userId];
    
    // Ajouter les autres membres (si fournis)
    if (memberIds && Array.isArray(memberIds)) {
      memberIds.forEach(id => {
        if (id !== req.userId && !members.includes(id)) {
          members.push(id);
        }
      });
    }
    
    const group = new Group({
      name: name.trim(),
      description: description?.trim() || '',
      creator: req.userId,
      members
    });
    
    await group.save();
    
    // Populer les informations des membres
    await group.populate('members', 'username');
    await group.populate('creator', 'username');
    
    // Émettre un événement socket pour notifier les membres ajoutés (sauf le créateur)
    if (members.length > 1) {
      const io = require('../socket').getIO();
      members.forEach(memberId => {
        if (memberId !== req.userId) {
          io.emit('group:member:added', {
            groupId: group._id.toString(),
            group: group.toJSON(),
            userId: memberId
          });
        }
      });
    }
    
    res.status(201).json({
      success: true,
      data: group.toJSON()
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du groupe',
      message: error.message
    });
  }
});

// GET /api/groups - Liste tous les groupes dont l'utilisateur est membre
router.get('/', authMiddleware, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.userId })
      .populate('members', 'username')
      .populate('creator', 'username')
      .sort({ updatedAt: -1 });
    
    res.json({
      success: true,
      data: groups.map(g => g.toJSON())
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des groupes',
      message: error.message
    });
  }
});

// GET /api/groups/:id - Obtenir les détails d'un groupe
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Groupe non trouvé'
      });
    }
    
    // Vérifier que l'utilisateur est membre (avant populate)
    if (!group.isMember(req.userId)) {
      return res.status(403).json({
        success: false,
        error: 'Vous n\'êtes pas membre de ce groupe'
      });
    }
    
    // Populate après la vérification
    await group.populate('members', 'username');
    await group.populate('creator', 'username');
    
    res.json({
      success: true,
      data: group.toJSON()
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du groupe',
      message: error.message
    });
  }
});

// PUT /api/groups/:id - Mettre à jour un groupe
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Groupe non trouvé'
      });
    }
    
    // Seul le créateur peut modifier le groupe
    if (group.creator.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Seul le créateur peut modifier le groupe'
      });
    }
    
    if (name) group.name = name.trim();
    if (description !== undefined) group.description = description.trim();
    group.updatedAt = new Date();
    
    await group.save();
    await group.populate('members', 'username');
    await group.populate('creator', 'username');
    
    res.json({
      success: true,
      data: group.toJSON()
    });
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du groupe',
      message: error.message
    });
  }
});

// POST /api/groups/:id/members - Ajouter des membres à un groupe
router.post('/:id/members', authMiddleware, async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Liste d\'utilisateurs requise'
      });
    }
    
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Groupe non trouvé'
      });
    }
    
    // Vérifier que l'utilisateur est membre
    if (!group.isMember(req.userId)) {
      return res.status(403).json({
        success: false,
        error: 'Vous devez être membre pour ajouter des utilisateurs'
      });
    }
    
    // Ajouter les nouveaux membres
    const newMembers = [];
    userIds.forEach(userId => {
      if (!group.isMember(userId)) {
        group.addMember(userId);
        newMembers.push(userId);
      }
    });
    
    await group.save();
    await group.populate('members', 'username');
    await group.populate('creator', 'username');
    
    // Émettre un événement socket pour notifier les nouveaux membres
    if (newMembers.length > 0) {
      const io = require('../socket').getIO();
      newMembers.forEach(memberId => {
        io.emit('group:member:added', {
          groupId: group._id.toString(),
          group: group.toJSON(),
          userId: memberId
        });
      });
    }
    
    res.json({
      success: true,
      data: group.toJSON()
    });
  } catch (error) {
    console.error('Error adding members:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout de membres',
      message: error.message
    });
  }
});

// DELETE /api/groups/:id/members/:userId - Retirer un membre d'un groupe
router.delete('/:id/members/:userId', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Groupe non trouvé'
      });
    }
    
    const userToRemove = req.params.userId;
    const currentUserId = req.userId.toString();
    
    // Soit le créateur retire quelqu'un, soit l'utilisateur se retire lui-même
    if (group.creator.toString() !== currentUserId && userToRemove !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: 'Non autorisé'
      });
    }
    
    // Ne pas permettre de retirer le créateur
    if (userToRemove === group.creator.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Le créateur ne peut pas quitter le groupe'
      });
    }
    
    group.removeMember(userToRemove);
    await group.save();
    await group.populate('members', 'username');
    await group.populate('creator', 'username');
    
    // Émettre un événement socket pour notifier que l'utilisateur a quitté
    const io = require('../socket').getIO();
    io.emit('group:member:removed', {
      groupId: group._id.toString(),
      userId: userToRemove,
      group: group.toJSON()
    });
    
    res.json({
      success: true,
      data: group.toJSON()
    });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du retrait du membre',
      message: error.message
    });
  }
});

// DELETE /api/groups/:id - Supprimer un groupe
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Groupe non trouvé'
      });
    }
    
    // Seul le créateur peut supprimer le groupe
    if (group.creator.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Seul le créateur peut supprimer le groupe'
      });
    }
    
    const groupId = group._id.toString();
    const members = [...group.members];
    
    await Group.findByIdAndDelete(req.params.id);
    
    // Émettre un événement socket pour notifier tous les membres
    const io = require('../socket').getIO();
    members.forEach(memberId => {
      io.emit('group:deleted', {
        groupId: groupId,
        userId: memberId.toString()
      });
    });
    
    res.json({
      success: true,
      message: 'Groupe supprimé avec succès'
    });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du groupe',
      message: error.message
    });
  }
});

module.exports = router;
