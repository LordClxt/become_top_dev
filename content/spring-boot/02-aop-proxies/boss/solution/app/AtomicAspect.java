package app;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.DefaultTransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Un @Transactional minimal : propagation REQUIRED (on rejoint une transaction en cours) et annulation pour
 * toute exception. Le gestionnaire lie la connexion au thread : JdbcClient la retrouve sans rien savoir de nous.
 */
@Aspect
public class AtomicAspect {
    private final PlatformTransactionManager transactions;

    public AtomicAspect(PlatformTransactionManager transactions) {
        this.transactions = transactions;
    }

    @Around("@annotation(app.Atomic)")
    public Object inTransaction(ProceedingJoinPoint call) throws Throwable {
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            return call.proceed();   // REQUIRED : on rejoint ; c'est la transaction externe qui décide
        }
        TransactionStatus tx = transactions.getTransaction(new DefaultTransactionDefinition());
        Object result;
        try {
            result = call.proceed();
        } catch (Throwable e) {
            transactions.rollback(tx);   // toute exception, vérifiée comprise
            throw e;
        }
        transactions.commit(tx);
        return result;
    }
}
