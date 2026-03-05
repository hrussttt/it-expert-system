import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { runAnalysis } from '../lib/expertEngine';
import Layout from '../components/Layout';

export default function ProjectDetailPage() {
    const { t, i18n } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editForm, setEditForm] = useState(null);

    useEffect(() => {
        fetchProject();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchProject = async () => {
        const { data } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .single();
        setProject(data);

        // Check for saved analysis
        const { data: saved } = await supabase
            .from('analyses')
            .select('*')
            .eq('project_id', id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (saved?.result) {
            setAnalysis(typeof saved.result === 'string' ? JSON.parse(saved.result) : saved.result);
        }
        setLoading(false);
    };

    const handleAnalyze = async () => {
        if (!project) return;
        setAnalyzing(true);

        // Fetch knowledge base
        const [
            { data: knowledgeProjects },
            { data: strategies },
            { data: rules },
        ] = await Promise.all([
            supabase.from('knowledge_projects').select('*'),
            supabase.from('strategies').select('*'),
            supabase.from('strategy_rules').select('*'),
        ]);

        const result = await runAnalysis(
            project,
            knowledgeProjects || [],
            strategies || [],
            rules || [],
            i18n.language
        );

        // Enrich similar projects with strategy names
        const strategyMap = {};
        (strategies || []).forEach(s => { strategyMap[s.id] = s; });
        result.similarProjects = result.similarProjects.map(sp => ({
            ...sp,
            strategyName: strategyMap[sp.strategy_id]?.name || '',
        }));

        // Save analysis
        await supabase.from('analyses').insert({
            project_id: project.id,
            result,
        });

        setAnalysis(result);
        setAnalyzing(false);
    };

    const handleEdit = () => {
        setEditForm({ ...project });
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditForm(null);
    };

    const handleEditChange = (field, value) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveEdit = async () => {
        if (!editForm) return;
        setSaving(true);
        try {
            const { data, error } = await supabase
                .from('projects')
                .update({
                    name: editForm.name,
                    description: editForm.description,
                    team_size: parseInt(editForm.team_size),
                    budget: parseFloat(editForm.budget),
                    duration_months: parseInt(editForm.duration_months),
                    complexity: editForm.complexity,
                    project_type: editForm.project_type,
                    risk_level: editForm.risk_level,
                    team_experience: editForm.team_experience,
                    client_involvement: editForm.client_involvement,
                    requirements_stability: editForm.requirements_stability,
                    tech_stack_novelty: editForm.tech_stack_novelty,
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            setProject(data);
            setIsEditing(false);
            setAnalysis(null); // Clear previous analysis when data changes
        } catch (err) {
            console.error('Error updating project:', err);
            alert('Failed to update project.');
        } finally {
            setSaving(false);
        }
    };

    const formatBudget = (v) => {
        if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
        if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
        return `$${v}`;
    };

    if (loading) {
        return (
            <Layout>
                <div className="loading-inline"><div className="loading-spinner" /></div>
            </Layout>
        );
    }

    if (!project) {
        return (
            <Layout>
                <div className="empty-state">
                    <h3>{t('common.error')}</h3>
                    <button className="btn btn-primary" onClick={() => navigate('/')}>
                        {t('analysis.back')}
                    </button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="page-header">
                <div className="toolbar">
                    <div>
                        {isEditing ? (
                            <input
                                type="text"
                                className="form-input"
                                value={editForm.name}
                                onChange={(e) => handleEditChange('name', e.target.value)}
                                style={{
                                    fontSize: '2.25rem',
                                    fontWeight: 800,
                                    fontFamily: 'var(--font-display)',
                                    marginBottom: '6px',
                                    paddingStep: '4px 8px',
                                    width: '100%',
                                    maxWidth: '400px',
                                }}
                            />
                        ) : (
                            <h1>{project.name}</h1>
                        )}
                        <p>{t('analysis.subtitle')}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-secondary" onClick={() => navigate('/')}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                <path d="M12 8H4M4 8l4-4M4 8l4 4" />
                            </svg>
                            {t('analysis.back')}
                        </button>
                        {!isEditing && (
                            <>
                                <button className="btn btn-secondary" onClick={handleEdit}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '2px' }}>
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                    {i18n.language === 'en' ? 'Edit' : 'Редагувати'}
                                </button>
                                <button className="btn btn-secondary" onClick={() => navigate(`/projects/${id}/forecast`)}>
                                    📈 {t('project.forecast')}
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleAnalyze}
                                    disabled={analyzing}
                                >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" transform="scale(0.65) translate(1, 1)" />
                                    </svg>
                                    {analyzing ? t('analysis.analyzing') : (analysis ? t('analysis.reanalyze') : t('analysis.runAnalysis'))}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Project Parameters */}
            <div className="analysis-section animate-in">
                <div className="analysis-section-title">{t('analysis.parameters')}</div>
                <div className="card">
                    {isEditing ? (
                        <div className="form-group" style={{ marginBottom: 20 }}>
                            <label className="form-label">{t('project.description')}</label>
                            <textarea
                                className="form-textarea"
                                value={editForm.description}
                                onChange={(e) => handleEditChange('description', e.target.value)}
                                placeholder={t('project.descriptionPlaceholder')}
                            />
                        </div>
                    ) : (
                        project.description && (
                            <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                                {project.description}
                            </p>
                        )
                    )}

                    <div className="params-grid">
                        <div className="param-item">
                            <span className="param-label">{t('project.teamSize')}</span>
                            {isEditing ? (
                                <input
                                    type="number"
                                    className="form-input"
                                    value={editForm.team_size}
                                    onChange={(e) => handleEditChange('team_size', e.target.value)}
                                    min="1"
                                    max="500"
                                    required
                                    style={{ padding: '8px 12px' }}
                                />
                            ) : (
                                <span className="param-value">{project.team_size}</span>
                            )}
                        </div>
                        <div className="param-item">
                            <span className="param-label">{t('project.budget')}</span>
                            {isEditing ? (
                                <input
                                    type="number"
                                    className="form-input"
                                    value={editForm.budget}
                                    onChange={(e) => handleEditChange('budget', e.target.value)}
                                    min="1000"
                                    required
                                    style={{ padding: '8px 12px' }}
                                />
                            ) : (
                                <span className="param-value">{formatBudget(project.budget)}</span>
                            )}
                        </div>
                        <div className="param-item">
                            <span className="param-label">{t('project.duration')}</span>
                            {isEditing ? (
                                <input
                                    type="number"
                                    className="form-input"
                                    value={editForm.duration_months}
                                    onChange={(e) => handleEditChange('duration_months', e.target.value)}
                                    min="1"
                                    max="60"
                                    required
                                    style={{ padding: '8px 12px' }}
                                />
                            ) : (
                                <span className="param-value">{project.duration_months} {t('common.months')}</span>
                            )}
                        </div>
                        <div className="param-item">
                            <span className="param-label">{t('project.complexity')}</span>
                            {isEditing ? (
                                <select
                                    className="form-select"
                                    value={editForm.complexity}
                                    onChange={(e) => handleEditChange('complexity', e.target.value)}
                                    style={{ padding: '8px 12px' }}
                                >
                                    {['low', 'medium', 'high', 'critical'].map(v => (
                                        <option key={v} value={v}>{t(`project.complexityLevels.${v}`)}</option>
                                    ))}
                                </select>
                            ) : (
                                <span className="param-value">
                                    <span className={`badge badge-${project.complexity}`}>
                                        {t(`project.complexityLevels.${project.complexity}`)}
                                    </span>
                                </span>
                            )}
                        </div>
                        <div className="param-item">
                            <span className="param-label">{t('project.projectType')}</span>
                            {isEditing ? (
                                <select
                                    className="form-select"
                                    value={editForm.project_type}
                                    onChange={(e) => handleEditChange('project_type', e.target.value)}
                                    style={{ padding: '8px 12px' }}
                                >
                                    {['development', 'support', 'migration', 'integration', 'research'].map(v => (
                                        <option key={v} value={v}>{t(`project.types.${v}`)}</option>
                                    ))}
                                </select>
                            ) : (
                                <span className="param-value">{t(`project.types.${project.project_type}`)}</span>
                            )}
                        </div>
                        <div className="param-item">
                            <span className="param-label">{t('project.riskLevel')}</span>
                            {isEditing ? (
                                <select
                                    className="form-select"
                                    value={editForm.risk_level}
                                    onChange={(e) => handleEditChange('risk_level', e.target.value)}
                                    style={{ padding: '8px 12px' }}
                                >
                                    {['low', 'medium', 'high', 'critical'].map(v => (
                                        <option key={v} value={v}>{t(`project.riskLevels.${v}`)}</option>
                                    ))}
                                </select>
                            ) : (
                                <span className="param-value">
                                    <span className={`badge badge-${project.risk_level}`}>
                                        {t(`project.riskLevels.${project.risk_level}`)}
                                    </span>
                                </span>
                            )}
                        </div>
                        <div className="param-item">
                            <span className="param-label">{t('project.teamExperience')}</span>
                            {isEditing ? (
                                <select
                                    className="form-select"
                                    value={editForm.team_experience}
                                    onChange={(e) => handleEditChange('team_experience', e.target.value)}
                                    style={{ padding: '8px 12px' }}
                                >
                                    {['junior', 'mixed', 'senior', 'expert'].map(v => (
                                        <option key={v} value={v}>{t(`project.experienceLevels.${v}`)}</option>
                                    ))}
                                </select>
                            ) : (
                                <span className="param-value">{t(`project.experienceLevels.${project.team_experience}`)}</span>
                            )}
                        </div>
                        <div className="param-item">
                            <span className="param-label">{t('project.clientInvolvement')}</span>
                            {isEditing ? (
                                <select
                                    className="form-select"
                                    value={editForm.client_involvement}
                                    onChange={(e) => handleEditChange('client_involvement', e.target.value)}
                                    style={{ padding: '8px 12px' }}
                                >
                                    {['minimal', 'moderate', 'active', 'embedded'].map(v => (
                                        <option key={v} value={v}>{t(`project.clientLevels.${v}`)}</option>
                                    ))}
                                </select>
                            ) : (
                                <span className="param-value">{t(`project.clientLevels.${project.client_involvement}`)}</span>
                            )}
                        </div>
                        <div className="param-item">
                            <span className="param-label">{t('project.requirementsStability')}</span>
                            {isEditing ? (
                                <select
                                    className="form-select"
                                    value={editForm.requirements_stability}
                                    onChange={(e) => handleEditChange('requirements_stability', e.target.value)}
                                    style={{ padding: '8px 12px' }}
                                >
                                    {['stable', 'evolving', 'volatile'].map(v => (
                                        <option key={v} value={v}>{t(`project.stabilityLevels.${v}`)}</option>
                                    ))}
                                </select>
                            ) : (
                                <span className="param-value">{t(`project.stabilityLevels.${project.requirements_stability}`)}</span>
                            )}
                        </div>
                        <div className="param-item">
                            <span className="param-label">{t('project.techStackNovelty')}</span>
                            {isEditing ? (
                                <select
                                    className="form-select"
                                    value={editForm.tech_stack_novelty}
                                    onChange={(e) => handleEditChange('tech_stack_novelty', e.target.value)}
                                    style={{ padding: '8px 12px' }}
                                >
                                    {['established', 'moderate', 'cutting_edge'].map(v => (
                                        <option key={v} value={v}>{t(`project.noveltyLevels.${v}`)}</option>
                                    ))}
                                </select>
                            ) : (
                                <span className="param-value">{t(`project.noveltyLevels.${project.tech_stack_novelty}`)}</span>
                            )}
                        </div>
                    </div>
                    {isEditing && (
                        <div className="form-actions" style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--color-border)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-secondary" onClick={handleCancelEdit} disabled={saving}>
                                {i18n.language === 'en' ? 'Cancel' : 'Скасувати'}
                            </button>
                            <button type="button" className="btn btn-primary" onClick={handleSaveEdit} disabled={saving}>
                                {saving ? (i18n.language === 'en' ? 'Saving...' : 'Збереження...') : (i18n.language === 'en' ? 'Save Changes' : 'Зберегти зміни')}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {!analysis && !analyzing && (
                <div className="no-analysis animate-in">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary-light)', marginBottom: 16 }}>
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                    </svg>
                    <p>{t('analysis.noAnalysis')}</p>
                    <button className="btn btn-primary btn-lg" onClick={handleAnalyze}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                        {t('analysis.runAnalysis')}
                    </button>
                </div>
            )}

            {analyzing && (
                <div className="loading-inline">
                    <div className="loading-spinner" />
                </div>
            )}

            {analysis && !analyzing && (
                <>
                    {/* Key Decision Factors */}
                    {analysis.keyFactors?.length > 0 && (
                        <div className="analysis-section animate-in">
                            <div className="analysis-section-title">{t('analysis.keyFactors')}</div>
                            <div className="key-factors">
                                {analysis.keyFactors.map((f, i) => (
                                    <span key={i} className="key-factor">{f}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recommended Strategies */}
                    <div className="analysis-section animate-in">
                        <div className="analysis-section-title">{t('analysis.recommended')}</div>
                        {analysis.strategies?.filter(s => s.matchScore > 0).map((strategy, idx) => (
                            <div
                                key={strategy.id}
                                className={`strategy-card animate-in ${idx === 0 ? 'best-match' : ''}`}
                                style={{ animationDelay: `${0.1 * idx}s` }}
                            >
                                <div className="strategy-header">
                                    <div>
                                        <div className="strategy-name">
                                            {idx === 0 && (
                                                <span
                                                    className="badge badge-medium"
                                                    style={{ marginRight: 8, fontSize: '0.625rem' }}
                                                >
                                                    ⭐ {t('analysis.bestMatch')}
                                                </span>
                                            )}
                                            {strategy.name}
                                        </div>
                                    </div>
                                    <div className="strategy-score">{strategy.matchScore}%</div>
                                </div>

                                <div className="strategy-description">
                                    {typeof strategy.description === 'object'
                                        ? strategy.description[i18n.language] || strategy.description.uk
                                        : strategy.description}
                                </div>

                                {/* Strategy Metrics */}
                                <div className="strategy-details">
                                    <div className="strategy-detail">
                                        <div className="strategy-detail-label">{t('analysis.successRate')}</div>
                                        <div className="strategy-detail-value">
                                            {strategy.scenarios?.realistic?.successRate}%
                                        </div>
                                        <div className="progress-bar" style={{ marginTop: 8 }}>
                                            <div
                                                className={`progress-fill ${strategy.scenarios?.realistic?.successRate >= 70 ? 'success' :
                                                    strategy.scenarios?.realistic?.successRate >= 40 ? 'warning' : 'danger'
                                                    }`}
                                                style={{ width: `${strategy.scenarios?.realistic?.successRate}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="strategy-detail">
                                        <div className="strategy-detail-label">{t('analysis.budgetImpact')}</div>
                                        <div className="strategy-detail-value">
                                            {strategy.scenarios?.realistic?.budgetVariance > 0 ? '+' : ''}
                                            {strategy.scenarios?.realistic?.budgetVariance}%
                                        </div>
                                    </div>
                                    <div className="strategy-detail">
                                        <div className="strategy-detail-label">{t('analysis.timeline')}</div>
                                        <div className="strategy-detail-value">
                                            {strategy.scenarios?.realistic?.timeVariance > 0 ? '+' : ''}
                                            {strategy.scenarios?.realistic?.timeVariance}%
                                        </div>
                                    </div>
                                </div>

                                {/* Scenarios */}
                                <div className="scenarios-grid">
                                    {['optimistic', 'realistic', 'pessimistic'].map(scenario => (
                                        <div key={scenario} className={`scenario-card ${scenario}`}>
                                            <div className="scenario-label">{t(`analysis.${scenario}`)}</div>
                                            <div className="scenario-value">
                                                {strategy.scenarios?.[scenario]?.successRate}%
                                            </div>
                                            <div className="scenario-desc">
                                                {strategy.scenarios?.[scenario]?.description?.[i18n.language] ||
                                                    strategy.scenarios?.[scenario]?.description?.uk}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Reasoning */}
                                {strategy.reasoning?.length > 0 && (
                                    <div style={{ marginTop: 20 }}>
                                        <div className="strategy-detail-label" style={{ marginBottom: 10 }}>
                                            {t('analysis.reasoning')}
                                        </div>
                                        <ul style={{
                                            fontSize: '0.875rem',
                                            color: 'var(--color-text-secondary)',
                                            paddingLeft: 18,
                                            listStyle: 'disc',
                                            lineHeight: 1.7,
                                        }}>
                                            {strategy.reasoning.map((r, i) => (
                                                <li key={i} style={{ marginBottom: 4 }}>{r}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Similar Projects */}
                    {analysis.similarProjects?.length > 0 && (
                        <div className="analysis-section animate-in">
                            <div className="analysis-section-title">{t('analysis.similarProjects')}</div>
                            {analysis.similarProjects.map(sp => (
                                <div key={sp.id} className="similar-project">
                                    <div className="similar-project-info">
                                        <h4>{sp.name}</h4>
                                        <p>
                                            {t('analysis.strategy')}: {sp.strategyName} · {t('analysis.outcome')}: {sp.outcome}
                                        </p>
                                    </div>
                                    <div className="similarity-score">{sp.similarity}%</div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </Layout>
    );
}
