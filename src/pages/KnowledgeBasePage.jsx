import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';

export default function KnowledgeBasePage() {
    const { t, i18n } = useTranslation();
    const { isAdmin } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchKnowledgeProjects();
    }, []);

    const fetchKnowledgeProjects = async () => {
        try {
            const { data, error } = await supabase
                .from('knowledge_projects')
                .select(`
                    *,
                    strategy:strategies(name)
                `)
                .order('name', { ascending: true });

            if (error) throw error;
            setProjects(data || []);
        } catch (err) {
            console.error('Error fetching knowledge projects:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm(t('knowledge.deleteConfirm'))) return;

        try {
            const { error } = await supabase
                .from('knowledge_projects')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchKnowledgeProjects();
        } catch (err) {
            alert('Error deleting project: ' + err.message);
        }
    };

    const formatBudget = (budget) => {
        if (budget >= 1000000) return `$${(budget / 1000000).toFixed(1)}M`;
        if (budget >= 1000) return `$${(budget / 1000).toFixed(0)}K`;
        return `$${budget}`;
    };

    return (
        <Layout>
            <div className="page-header">
                <h1>{t('knowledge.title')}</h1>
                <p>{t('knowledge.subtitle')}</p>
            </div>

            {loading ? (
                <div className="loading-inline">
                    <div className="loading-spinner" />
                </div>
            ) : projects.length === 0 ? (
                <div className="empty-state">
                    <h3>{t('knowledge.noProjects')}</h3>
                </div>
            ) : (
                <>
                    <div className="alert alert-info" style={{ marginBottom: '2rem', padding: '1rem', borderRadius: '8px', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-primary-light)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        <div>
                            <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-text)' }}>{i18n.language === 'en' ? 'Demonstration Dataset' : 'Демонстраційний масив даних'}</h4>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                                {i18n.language === 'en'
                                    ? 'The current database contains 50 reference records to demonstrate the Case-Based Reasoning (CBR) algorithm. A production version of the system is designed to process 100,000+ historical projects for high-accuracy forecasting.'
                                    : 'Поточна база містить 50 референсних записів для демонстрації алгоритму CBR. Продакшн-версія системи розрахована на обробку 100 000+ історичних проєктів для високоточного прогнозування.'}
                            </p>
                        </div>
                    </div>
                    <div className="knowledge-grid">
                        {projects.map(project => (
                            <div key={project.id} className="knowledge-card card">
                                <div className="knowledge-header">
                                    <h3>{project.name}</h3>
                                    {isAdmin && (
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                className="btn-icon btn-danger"
                                                onClick={() => handleDelete(project.id)}
                                                title={t('knowledge.deleteProject')}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M3 4H13M5 4V3C5 2.44772 5.44772 2 6 2H10C10.5523 2 11 2.44772 11 3V4M12 4V13C12 13.5523 11.5523 14 11 14H5C4.44772 14 4 13.5523 4 13V4H12Z" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {project.description && (
                                    <p className="knowledge-description">{project.description}</p>
                                )}

                                <div className="knowledge-meta">
                                    <div className="meta-item">
                                        <span className="meta-label">{t('project.projectType')}</span>
                                        <span className="meta-value">{t(`project.types.${project.project_type}`)}</span>
                                    </div>
                                    <div className="meta-item">
                                        <span className="meta-label">{t('project.complexity')}</span>
                                        <span className={`badge badge-${project.complexity}`}>
                                            {t(`project.complexityLevels.${project.complexity}`)}
                                        </span>
                                    </div>
                                    <div className="meta-item">
                                        <span className="meta-label">{t('project.teamSize')}</span>
                                        <span className="meta-value">{project.team_size} {t('common.people')}</span>
                                    </div>
                                    <div className="meta-item">
                                        <span className="meta-label">{t('project.budget')}</span>
                                        <span className="meta-value">{formatBudget(project.budget)}</span>
                                    </div>
                                    <div className="meta-item">
                                        <span className="meta-label">{t('knowledge.strategy')}</span>
                                        <span className="meta-value">{project.strategy?.name || '—'}</span>
                                    </div>
                                    <div className="meta-item">
                                        <span className="meta-label">{t('knowledge.outcome')}</span>
                                        <span className="meta-value">{project.outcome}</span>
                                    </div>
                                    {project.success_rate && (
                                        <div className="meta-item">
                                            <span className="meta-label">{t('knowledge.successRate')}</span>
                                            <span className="meta-value">{(project.success_rate * 100).toFixed(0)}%</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </Layout>
    );
}
