package app;

import javax.sql.DataSource;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.annotation.RollbackOn;

@Configuration
@ComponentScan
// Par défaut, une exception vérifiée VALIDE la transaction. ALL_EXCEPTIONS (Spring 6.2) annule pour toutes :
// la prochaine exception vérifiée ajoutée ne pourra plus être oubliée dans un rollbackFor.
@EnableTransactionManagement(rollbackOn = RollbackOn.ALL_EXCEPTIONS)
public class TxConfig {

    @Bean
    DataSource dataSource() {
        return new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2).generateUniqueName(true).build();
    }

    @Bean
    JdbcClient jdbcClient(DataSource dataSource) { return JdbcClient.create(dataSource); }

    @Bean
    DataSourceTransactionManager transactionManager(DataSource dataSource) { return new DataSourceTransactionManager(dataSource); }
}
